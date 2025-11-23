import { configure, tasks } from '@trigger.dev/sdk'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getConfig } from '@app/config'

// Ensure Trigger.dev is configured once per process
let isTriggerConfigured = false

function ensureTriggerConfigured() {
  if (!isTriggerConfigured) {
    const { TRIGGER_SECRET_KEY: secretKey } = getConfig()
    configure({ secretKey })
    isTriggerConfigured = true
  }
}

const requestSchema = z.object({
  installation_id: z.number(),
})

export async function POST(request: NextRequest) {
  try {
    ensureTriggerConfigured()

    const body = await request.json()
    const { installation_id } = requestSchema.parse(body)

    const handle = await tasks.trigger(
      'sync-github-installation',
      {
        installationId: installation_id,
      },
      {
        idempotencyKey: `sync-${installation_id}`,
        idempotencyKeyTTL: '10m',
        priority: 10,
      },
    )

    return Response.json({
      success: true,
      triggerHandle: {
        publicAccessToken: handle.publicAccessToken,
        id: handle.id,
      },
      installationId: installation_id,
    })
  } catch (error) {
    console.error('Failed to sync installation:', error)

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          success: false,
          error: 'Invalid request body',
        },
        { status: 400 },
      )
    }

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to sync installation',
      },
      { status: 500 },
    )
  }
}
