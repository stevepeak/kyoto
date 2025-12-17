import { getConfig } from '@app/config'
import { runVmTestAgent, serializeAsciicast } from '@app/daytona'
import { createDb, eq, schema } from '@app/db'
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

type VmAgentTaskOutput = {
  success: boolean
  sandboxId: string | null
  observations: StoryTestOutput | null
  error: string | null
}

export const vmAgentTask = task({
  id: 'vm-agent',
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
      void streams.append('progress', 'Creating VM sandbox...')

      // Create ephemeral sandbox
      sandbox = await daytona.create({
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

      void streams.append('progress', 'Running VM test agent...')

      // Create OpenRouter model for the agent
      const openrouter = createOpenRouter({
        apiKey: config.OPENROUTER_API_KEY,
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

      // Update run with results and terminal recording
      await db
        .update(schema.storyRuns)
        .set({
          status: 'completed',
          observations,
          terminalRecording,
          updatedAt: new Date(),
        })
        .where(eq(schema.storyRuns.id, runId))

      // Send webhooks for completed run
      const webhookPayload: WebhookPayload = {
        event: 'run.completed',
        timestamp: new Date().toISOString(),
        story: { id: story.id, name: story.name },
        run: {
          id: runId,
          status: 'completed',
          createdAt: new Date().toISOString(),
          error: null,
          sessionRecordingUrl: null,
          observations,
        },
      }

      await sendWebhooks({
        databaseUrl: config.DATABASE_URL,
        userId: story.userId,
        payload: webhookPayload,
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

      // Update run with error
      await db
        .update(schema.storyRuns)
        .set({
          status: 'failed',
          error: errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(schema.storyRuns.id, runId))

      // Send webhooks for failed run
      const webhookPayload: WebhookPayload = {
        event: 'run.failed',
        timestamp: new Date().toISOString(),
        story: { id: story.id, name: story.name },
        run: {
          id: runId,
          status: 'failed',
          createdAt: new Date().toISOString(),
          error: errorMessage,
          sessionRecordingUrl: null,
          observations: null,
        },
      }

      await sendWebhooks({
        databaseUrl: config.DATABASE_URL,
        userId: story.userId,
        payload: webhookPayload,
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
