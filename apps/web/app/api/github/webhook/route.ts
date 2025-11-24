import { configure, tasks } from '@trigger.dev/sdk'
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

// Ensure Trigger.dev is configured once per process
let isTriggerConfigured = false

function ensureTriggerConfigured() {
  if (!isTriggerConfigured) {
    configure({
      secretKey: process.env.TRIGGER_SECRET_KEY,
    })
    isTriggerConfigured = true
  }
}

function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature) {
    return false
  }

  const hmac = createHmac('sha256', secret)
  const digest = 'sha256=' + hmac.update(payload).digest('hex')

  // Use timing-safe comparison to prevent timing attacks
  if (signature.length !== digest.length) {
    return false
  }

  const signatureBuffer = Buffer.from(signature)
  const digestBuffer = Buffer.from(digest)

  return timingSafeEqual(signatureBuffer, digestBuffer)
}

type PreviewDeploymentProvider = 'vercel'

interface PreviewDeploymentDetectionResult {
  previewUrl: string
  provider: PreviewDeploymentProvider
  source: 'deployment_status' | 'repository_dispatch'
}

type PreviewDetector = (
  eventType: string,
  payload: unknown,
) => PreviewDeploymentDetectionResult | null

function detectVercelPreviewDeployment(
  eventType: string,
  payload: unknown,
): PreviewDeploymentDetectionResult | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  if (eventType === 'deployment_status') {
    const root = payload as Record<string, unknown>
    const deploymentStatusRaw = root.deployment_status
    const deploymentRaw = root.deployment

    if (
      deploymentStatusRaw &&
      typeof deploymentStatusRaw === 'object' &&
      deploymentRaw &&
      typeof deploymentRaw === 'object'
    ) {
      const deploymentStatus = deploymentStatusRaw as Record<string, unknown>
      const deployment = deploymentRaw as Record<string, unknown>

      const environmentUrl = deploymentStatus.environment_url
      const environment = deployment.environment

      if (
        typeof environmentUrl === 'string' &&
        typeof environment === 'string' &&
        environment.toLowerCase() === 'preview'
      ) {
        return {
          previewUrl: environmentUrl,
          provider: 'vercel',
          source: 'deployment_status',
        }
      }
    }

    return null
  }

  if (eventType === 'repository_dispatch') {
    const root = payload as Record<string, unknown>
    const action = typeof root.action === 'string' ? root.action : null
    const clientPayloadRaw = root.client_payload

    if (
      !action ||
      !action.startsWith('vercel.deployment.') ||
      !clientPayloadRaw ||
      typeof clientPayloadRaw !== 'object'
    ) {
      return null
    }

    const clientPayload = clientPayloadRaw as Record<string, unknown>
    const deploymentRaw = clientPayload.deployment

    const urlCandidate = clientPayload.url
    const deployment =
      deploymentRaw && typeof deploymentRaw === 'object'
        ? (deploymentRaw as Record<string, unknown>)
        : null

    const url =
      typeof urlCandidate === 'string'
        ? urlCandidate
        : deployment && typeof deployment.url === 'string'
          ? deployment.url
          : null

    const environmentCandidate = deployment?.environment ?? clientPayload.environment

    const environment =
      typeof environmentCandidate === 'string' ? environmentCandidate : null

    if (url && environment && environment.toLowerCase() === 'preview') {
      return {
        previewUrl: url,
        provider: 'vercel',
        source: 'repository_dispatch',
      }
    }

    return null
  }

  return null
}

const PREVIEW_DEPLOYMENT_DETECTORS: Record<
  PreviewDeploymentProvider,
  PreviewDetector
> = {
  vercel: detectVercelPreviewDeployment,
}

// Currently only Vercel is supported; update this when adding new providers.
const DEFAULT_PREVIEW_PROVIDER: PreviewDeploymentProvider = 'vercel'

function detectPreviewDeployment(
  provider: PreviewDeploymentProvider,
  eventType: string,
  payload: unknown,
): PreviewDeploymentDetectionResult | null {
  const detector = PREVIEW_DEPLOYMENT_DETECTORS[provider]

  if (!detector) {
    return null
  }

  return detector(eventType, payload)
}

export async function POST(request: NextRequest) {
  try {
    ensureTriggerConfigured()

    const githubWebhookSecret = process.env.GITHUB_WEBHOOK_SECRET
    if (!githubWebhookSecret) {
      return Response.json(
        {
          success: false,
          error: 'GITHUB_WEBHOOK_SECRET is not configured',
        },
        { status: 500 },
      )
    }

    // Get headers
    const signature = request.headers.get('x-hub-signature-256')
    const eventType = request.headers.get('x-github-event')
    const deliveryId = request.headers.get('x-github-delivery')

    if (!signature) {
      return Response.json(
        {
          success: false,
          error: 'Missing x-hub-signature-256 header',
        },
        { status: 401 },
      )
    }

    if (!eventType) {
      return Response.json(
        {
          success: false,
          error: 'Missing x-github-event header',
        },
        { status: 400 },
      )
    }

    if (!deliveryId) {
      return Response.json(
        {
          success: false,
          error: 'Missing x-github-delivery header',
        },
        { status: 400 },
      )
    }

    // Get raw body for signature verification
    const rawBody = await request.text()

    // Verify signature
    if (!verifyGitHubSignature(rawBody, signature, githubWebhookSecret)) {
      return Response.json(
        {
          success: false,
          error: 'Invalid signature',
        },
        { status: 401 },
      )
    }

    // Parse payload
    const payload = JSON.parse(rawBody) as unknown

    const previewDeployment = detectPreviewDeployment(
      DEFAULT_PREVIEW_PROVIDER,
      eventType,
      payload,
    )

    if (previewDeployment) {
      console.info('Detected preview deployment from GitHub webhook', {
        eventType,
        deliveryId,
        previewUrl: previewDeployment.previewUrl,
        provider: previewDeployment.provider,
        source: previewDeployment.source,
      })
    }

    // Skip events that are not in the allowed list
    const allowedEvents = [
      'push',
      'pull_request',
      'installation',
      'installation_repositories',
      'installation_targets',
    ]
    if (!allowedEvents.includes(eventType)) {
      return Response.json({
        success: true,
        eventType,
        deliveryId,
        skipped: true,
      })
    }

    // Extract repository info safely for tags
    const tags: string[] = [`type_${eventType}`]
    if (
      payload &&
      typeof payload === 'object' &&
      'repository' in payload &&
      payload.repository &&
      typeof payload.repository === 'object'
    ) {
      const repo = payload.repository as Record<string, unknown>
      if (typeof repo.name === 'string') {
        tags.push(`repo_${repo.name}`)
      }
      if (
        repo.owner &&
        typeof repo.owner === 'object' &&
        'login' in repo.owner &&
        typeof repo.owner.login === 'string'
      ) {
        tags.push(`owner_${repo.owner.login}`)
      }
    }

    // Trigger the webhook task
    await tasks.trigger(
      'handle-github-webhook',
      {
        eventType,
        deliveryId,
        payload,
      },
      {
        tags,
      },
    )

    return Response.json({
      success: true,
      eventType,
      deliveryId,
    })
  } catch (error) {
    console.error('Failed to handle GitHub webhook:', error)

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to handle webhook',
      },
      { status: 500 },
    )
  }
}
