import { configure, tasks } from '@trigger.dev/sdk'
import { createHmac, timingSafeEqual } from 'crypto'
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
    const payload = JSON.parse(rawBody)

    // Trigger the webhook task
    await tasks.trigger('handle-github-webhook', {
      eventType,
      deliveryId,
      payload,
    })

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
