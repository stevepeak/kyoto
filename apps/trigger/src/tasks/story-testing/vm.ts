import { runVmAgent, type VmAgentOutput } from '@app/agents'
import { getConfig } from '@app/config'
import { createDb, eq, schema } from '@app/db'
import { type WebhookPayload } from '@app/schemas'
import { Daytona } from '@daytonaio/sdk'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { logger, streams, task } from '@trigger.dev/sdk'
import { writeFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'

import { sendWebhooks } from '../../helpers/send-webhooks'

type VmAgentTaskInput = {
  runId: string
  storyId: string
  instructions: string
}

type VmAgentTaskOutput = {
  success: boolean
  sandboxId: string | null
  asciinemaPath: string | null
  observations: VmAgentOutput | null
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

      void streams.append(
        'progress',
        'Installing asciinema for session recording...',
      )

      // Install asciinema
      const installResult = await sandbox.process.executeCommand(
        'apt-get update && apt-get install -y asciinema',
      )

      if (installResult.exitCode !== 0) {
        throw new Error(`Failed to install asciinema: ${installResult.result}`)
      }

      logger.log('Asciinema installed successfully')

      // Create a recording file path in the sandbox
      const recordingPath = '/tmp/session-recording.cast'

      void streams.append('progress', 'Starting asciinema recording...')

      // Start asciinema recording in the background
      // We use script to capture the session since asciinema rec needs a PTY
      await sandbox.process.executeCommand(
        `asciinema rec ${recordingPath} --stdin --command "bash" &`,
      )

      // Give asciinema a moment to start
      await new Promise((resolve) => setTimeout(resolve, 1000))

      void streams.append(
        'progress',
        'VM sandbox ready. Executing instructions...',
      )

      // Create OpenRouter model for the agent
      const openrouter = createOpenRouter({
        apiKey: config.OPENROUTER_API_KEY,
      })
      const model = openrouter('openai/gpt-4o-mini')

      // Run the VM agent
      const observations = await runVmAgent({
        instructions,
        sandbox,
        model,
        maxSteps: 50,
        onProgress: (message) => {
          logger.log('Agent progress', { message })
          void streams.append('progress', message)
        },
      })

      logger.log('VM agent completed', { observations })
      void streams.append('progress', 'VM agent completed. Saving recording...')

      // Stop the asciinema recording by sending exit command
      await sandbox.process.executeCommand('pkill -INT asciinema || true')

      // Wait a moment for recording to finalize
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Download the recording
      let asciinemaPath: string | null = null
      try {
        const recordingBuffer = await sandbox.fs.downloadFile(recordingPath)

        // Save to local machine
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const filename = `kyoto-vm-${runId}-${timestamp}.cast`
        asciinemaPath = join(homedir(), 'Downloads', filename)

        await writeFile(asciinemaPath, recordingBuffer)
        logger.log('Asciinema recording saved', { path: asciinemaPath })
        void streams.append('progress', `Recording saved to: ${asciinemaPath}`)
      } catch (recordingError) {
        logger.warn('Failed to save asciinema recording', {
          error:
            recordingError instanceof Error
              ? recordingError.message
              : String(recordingError),
        })
        void streams.append(
          'progress',
          'Note: Could not save recording (session may have been too short)',
        )
      }

      void streams.append('progress', 'VM agent completed successfully!')

      // Update run with results
      await db
        .update(schema.storyRuns)
        .set({
          status: 'completed',
          observations,
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
        success: true,
        sandboxId,
        asciinemaPath,
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
        asciinemaPath: null,
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
