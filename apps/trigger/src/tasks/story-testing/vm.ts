import { getConfig } from '@app/config'
import { createDb, eq, schema } from '@app/db'
import { type StoryTestOutput, type WebhookPayload } from '@app/schemas'
import { Daytona } from '@daytonaio/sdk'
import { logger, streams, task } from '@trigger.dev/sdk'
import { writeFile } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'
import { dedent } from 'ts-dedent'

import { sendWebhooks } from '../github/send-webhooks'

type VmAgentTaskInput = {
  runId: string
  storyId: string
  instructions: string
}

type VmAgentTaskOutput = {
  success: boolean
  sandboxId: string | null
  asciinemaPath: string | null
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

      void streams.append('progress', 'Installing dependencies...')

      // Install dependencies
      const installResult = await sandbox.process.executeCommand(
        dedent`
          sudo apt-get update && \
          sudo apt-get install -y asciinema
        `,
      )

      if (installResult.exitCode !== 0) {
        throw new Error(
          `Failed to install dependencies: ${installResult.result}`,
        )
      }

      // Create a recording file path in the sandbox
      const recordingPath = '/tmp/session-recording.cast'

      void streams.append('progress', 'Running tests...')

      await sandbox.fs.uploadFile(Buffer.from(instructions), 'instructions.md')

      const testResult = await sandbox.process.executeCommand(
        dedent`
          asciinema rec ${recordingPath} -c \
            'echo "hello world" && sleep 5 && cat instructions.md'
        `,
      )
      // const testResult = await sandbox.process.executeCommand(
      //   dedent`
      //     npx @usekyoto/cli vibe test \
      //       --vm \
      //       --prompt instructions.md \
      //       --record ${recordingPath}
      //   `,
      // )

      // TODO: Parse observations from CLI output when format is defined
      const observations: StoryTestOutput | null = null
      logger.log('Test result', {
        exitCode: testResult.exitCode,
        output: testResult.result,
      })

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
