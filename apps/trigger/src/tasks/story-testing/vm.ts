import { getConfig } from '@app/config'
import { runVmTestAgent, serializeAsciicast } from '@app/daytona'
import { createDb, eq, schema } from '@app/db'
import { ensureOpenRouterApiKey } from '@app/openrouter'
import { type StoryTestOutput, type WebhookPayload } from '@app/schemas'
import { cleanAsciicast } from '@app/utils'
import { Daytona } from '@daytonaio/sdk'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { logger, streams, task } from '@trigger.dev/sdk'

import { sendWebhooks } from '../github/send-webhooks'

type VmAgentTaskInput = {
  runId: string
  storyId: string
  instructions: string
}

/**
 * Updates the run status in the database and sends webhook notifications.
 * Consolidates the duplicated DB update and webhook logic.
 */
async function updateAndNotifyRun(args: {
  db: ReturnType<typeof createDb>
  runId: string
  story: { id: string; name: string; userId: string }
  status: 'completed' | 'failed'
  observations?: StoryTestOutput
  error?: string
  terminalRecording?: string
  databaseUrl: string
}): Promise<void> {
  const {
    db,
    runId,
    story,
    status,
    observations,
    error,
    terminalRecording,
    databaseUrl,
  } = args

  // Update run status in database
  const updateData: {
    status: 'completed' | 'failed'
    updatedAt: Date
    observations?: StoryTestOutput
    error?: string
    terminalRecording?: string
  } = {
    status,
    updatedAt: new Date(),
  }

  if (observations !== undefined) {
    updateData.observations = observations
  }
  if (error !== undefined) {
    updateData.error = error
  }
  if (terminalRecording !== undefined) {
    updateData.terminalRecording = terminalRecording
  }

  await db
    .update(schema.storyRuns)
    .set(updateData)
    .where(eq(schema.storyRuns.id, runId))

  // Send webhook notification
  const webhookEvent = status === 'completed' ? 'run.completed' : 'run.failed'
  const webhookPayload: WebhookPayload = {
    event: webhookEvent,
    timestamp: new Date().toISOString(),
    story: { id: story.id, name: story.name },
    run: {
      id: runId,
      status,
      createdAt: new Date().toISOString(),
      error: error ?? null,
      sessionRecordingUrl: null,
      observations: observations ?? null,
    },
  }

  await sendWebhooks({
    databaseUrl,
    userId: story.userId,
    payload: webhookPayload,
  })
}

type VmAgentTaskOutput = {
  success: boolean
  sandboxId: string | null
  observations: StoryTestOutput | null
  error: string | null
}

export const vmAgentTask = task({
  id: 'vm-agent',
  maxDuration: 60 * 10, // 10 minutes timeout
  run: async (input: VmAgentTaskInput): Promise<VmAgentTaskOutput> => {
    const { runId, storyId, instructions } = input

    logger.log('Starting VM agent task', { runId, storyId })

    const config = getConfig()
    const db = createDb({ databaseUrl: config.DATABASE_URL })

    // Fetch story info for webhooks
    const story = await db.query.stories.findFirst({
      where: eq(schema.stories.id, storyId),
    })

    if (!story) {
      throw new Error(`Story not found: ${storyId}`)
    }

    // Update run status to running
    await db
      .update(schema.storyRuns)
      .set({ status: 'running', updatedAt: new Date() })
      .where(eq(schema.storyRuns.id, runId))

    const daytona = new Daytona({ apiKey: config.DAYTONA_API_KEY })
    let sandbox: Awaited<ReturnType<typeof daytona.create>> | null = null

    try {
      void streams.append('progress', 'Creating sandbox')

      // Create ephemeral sandbox
      sandbox = await daytona.create({
        // * gave up on this because i could not upload the image to daytona
        // image: 'kyoto-cli-base',
        language: 'typescript',
        autoStopInterval: 30, // Auto-stop after 30 minutes of inactivity
      })

      const sandboxId = sandbox.id
      logger.log('VM sandbox created', { sandboxId })

      // Update run with sandbox ID (reusing sessionId field)
      await db
        .update(schema.storyRuns)
        .set({ sessionId: sandboxId, updatedAt: new Date() })
        .where(eq(schema.storyRuns.id, runId))

      // Get user's OpenRouter API key
      const userApiKey = await ensureOpenRouterApiKey({
        db,
        userId: story.userId,
      })

      // Create OpenRouter model for the agent
      const openrouter = createOpenRouter({
        apiKey: userApiKey,
      })
      const model = openrouter('openai/gpt-5-mini')

      // Run the VM test agent with recorded PTY session
      const result = await runVmTestAgent({
        model,
        sandbox,
        instructions,
        maxSteps: 50,
        onProgress: (message) => {
          logger.log('Agent progress', { message })
          void streams.append('progress', message)
        },
      })

      logger.log('VM test agent completed', {
        success: result.success,
        observationsCount: result.observations.observations.length,
      })

      // Serialize and clean the terminal recording
      const rawRecording = serializeAsciicast(result.recording)
      const terminalRecording = cleanAsciicast({ content: rawRecording })
      logger.log('Terminal recording captured', {
        length: terminalRecording.length,
      })

      void streams.append('progress', 'VM agent completed successfully!')

      // Use the structured observations from the agent
      const observations: StoryTestOutput = result.observations

      // Update run with results and terminal recording, then send webhooks
      await updateAndNotifyRun({
        db,
        runId,
        story,
        status: 'completed',
        observations,
        terminalRecording,
        databaseUrl: config.DATABASE_URL,
      })

      return {
        success: result.success,
        sandboxId,
        observations,
        error: null,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      logger.error('VM agent failed', { error: errorMessage })
      void streams.append('progress', `Error: ${errorMessage}`)

      const sandboxId = sandbox?.id ?? null

      // Update run with error, then send webhooks
      await updateAndNotifyRun({
        db,
        runId,
        story,
        status: 'failed',
        error: errorMessage,
        databaseUrl: config.DATABASE_URL,
      })

      return {
        success: false,
        sandboxId,
        observations: null,
        error: errorMessage,
      }
    } finally {
      // Clean up sandbox
      if (sandbox) {
        try {
          await sandbox.delete()
          logger.log('Sandbox deleted', { sandboxId: sandbox.id })
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  },
})
