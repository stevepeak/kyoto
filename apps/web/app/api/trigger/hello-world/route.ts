import { getConfig } from '@app/config'
import { configure, tasks } from '@trigger.dev/sdk'
import { type NextRequest } from 'next/server'

// Ensure Trigger.dev is configured once per process
let isTriggerConfigured = false

function ensureTriggerConfigured() {
  if (!isTriggerConfigured) {
    const config = getConfig()
    configure({
      secretKey: config.TRIGGER_SECRET_KEY,
    })
    isTriggerConfigured = true
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureTriggerConfigured()

    const body = await request.json()
    const { name } = body as { name?: string }

    const handle = await tasks.trigger('hello-world', { name })

    return Response.json({
      success: true,
      triggerHandle: {
        id: handle.id,
        publicAccessToken: handle.publicAccessToken,
      },
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to trigger hello-world task:', error)

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to trigger task',
      },
      { status: 500 },
    )
  }
}
