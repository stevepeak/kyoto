import { type BrowserAgentOutput, runBrowserAgent } from '@app/agents'
import { type BrowserbaseToolsContext } from '@app/browserbase'
import { getConfig } from '@app/config'
import { createDb, eq, schema } from '@app/db'
import { type WebhookPayload } from '@app/schemas'
import { Stagehand } from '@browserbasehq/stagehand'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { logger, streams, task } from '@trigger.dev/sdk'

import { sendWebhooks } from '../../helpers/send-webhooks'

type BrowserAgentTaskInput = {
  runId: string
  storyId: string
  instructions: string
}

type BrowserAgentTaskOutput = {
  success: boolean
  sessionId: string | null
  sessionRecordingUrl: string | null
  observations: BrowserAgentOutput | null
  error: string | null
}

export const browserAgentTask = task({
  id: 'browser-agent',
  run: async (
    input: BrowserAgentTaskInput,
  ): Promise<BrowserAgentTaskOutput> => {
    const { runId, storyId, instructions } = input

    logger.log('Starting browser agent task', { runId, storyId })

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

    let stagehand: Stagehand | null = null

    try {
      void streams.append('progress', 'Initializing browser session...')

      // Initialize Stagehand with Browserbase
      stagehand = new Stagehand({
        env: 'BROWSERBASE',
        apiKey: config.BROWSERBASE_API_KEY,
        projectId: config.BROWSERBASE_PROJECT_ID,
        model: 'openai/gpt-5-mini',
        verbose: 1,
      })

      await stagehand.init()

      const sessionId = stagehand.browserbaseSessionID ?? null
      logger.log('Browser session initialized', { sessionId })

      // Update run with session ID
      await db
        .update(schema.storyRuns)
        .set({ sessionId, updatedAt: new Date() })
        .where(eq(schema.storyRuns.id, runId))

      void streams.append(
        'progress',
        'Browser session ready. Executing instructions...',
      )

      // Create browser context for the agent
      const browserContext: BrowserbaseToolsContext = {
        stagehand,
        agent: stagehand.agent({
          model: 'openai/gpt-5-mini',
        }),
        onProgress: (message) => {
          void streams.append('progress', message)
        },
      }

      // Create OpenRouter model for the agent
      const openrouter = createOpenRouter({
        apiKey: config.OPENROUTER_API_KEY,
      })
      const model = openrouter('openai/gpt-5-mini')

      // Run the browser agent
      const observations = await runBrowserAgent({
        instructions,
        browserContext,
        model,
        maxSteps: 50,
        onProgress: (message) => {
          logger.log('Agent progress', { message })
          void streams.append('progress', message)
        },
      })

      logger.log('Browser agent completed', { observations })
      void streams.append('progress', 'Browser agent completed successfully!')

      // Get session recording URL
      const sessionRecordingUrl = sessionId
        ? `https://browserbase.com/sessions/${sessionId}`
        : null

      // Update run with results
      await db
        .update(schema.storyRuns)
        .set({
          status: 'completed',
          observations,
          sessionRecordingUrl,
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
          sessionRecordingUrl,
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
        sessionId,
        sessionRecordingUrl,
        observations,
        error: null,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      logger.error('Browser agent failed', { error: errorMessage })
      void streams.append('progress', `Error: ${errorMessage}`)

      const sessionId = stagehand?.browserbaseSessionID ?? null
      const sessionRecordingUrl = sessionId
        ? `https://browserbase.com/sessions/${sessionId}`
        : null

      // Update run with error
      await db
        .update(schema.storyRuns)
        .set({
          status: 'failed',
          error: errorMessage,
          sessionRecordingUrl,
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
          sessionRecordingUrl,
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
        sessionId,
        sessionRecordingUrl,
        observations: null,
        error: errorMessage,
      }
    } finally {
      // Clean up browser session
      if (stagehand) {
        try {
          await stagehand.close()
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  },
})
