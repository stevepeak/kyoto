import { type BrowserAgentOutput, runBrowserAgent } from '@app/agents'
import { type BrowserbaseToolsContext } from '@app/browserbase'
import { getConfig } from '@app/config'
import { createDb, eq, schema } from '@app/db'
import { Stagehand } from '@browserbasehq/stagehand'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { logger, streams, task } from '@trigger.dev/sdk'

type XpBrowserAgentInput = {
  runId: string
  storyId: string
  instructions: string
}

type XpBrowserAgentOutput = {
  success: boolean
  sessionId: string | null
  sessionRecordingUrl: string | null
  observations: BrowserAgentOutput | null
  error: string | null
}

export const xpBrowserAgentTask = task({
  id: 'xp-browser-agent',
  run: async (input: XpBrowserAgentInput): Promise<XpBrowserAgentOutput> => {
    const { runId, instructions } = input

    logger.log('Starting browser agent task', { runId })

    const config = getConfig()
    const db = createDb({ databaseUrl: config.DATABASE_URL })

    // Update run status to running
    await db
      .update(schema.xpStoriesRuns)
      .set({ status: 'running', updatedAt: new Date() })
      .where(eq(schema.xpStoriesRuns.id, runId))

    let stagehand: Stagehand | null = null

    try {
      void streams.append('progress', 'Initializing browser session...')

      // Initialize Stagehand with Browserbase
      stagehand = new Stagehand({
        env: 'BROWSERBASE',
        apiKey: config.BROWSERBASE_API_KEY,
        projectId: config.BROWSERBASE_PROJECT_ID,
        model: {
          modelName: 'openai/gpt-5-mini',
          apiKey: config.OPENROUTER_API_KEY,
        },
        verbose: 1,
      })

      await stagehand.init()

      const sessionId = stagehand.browserbaseSessionID ?? null
      logger.log('Browser session initialized', { sessionId })

      // Update run with session ID
      await db
        .update(schema.xpStoriesRuns)
        .set({ sessionId, updatedAt: new Date() })
        .where(eq(schema.xpStoriesRuns.id, runId))

      void streams.append(
        'progress',
        'Browser session ready. Executing instructions...',
      )

      // Create browser context for the agent
      const browserContext: BrowserbaseToolsContext = {
        stagehand,
        agent: stagehand.agent({
          model: {
            modelName: 'openai/gpt-5-mini',
            apiKey: config.OPENROUTER_API_KEY,
          },
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
        .update(schema.xpStoriesRuns)
        .set({
          status: 'completed',
          observations,
          sessionRecordingUrl,
          updatedAt: new Date(),
        })
        .where(eq(schema.xpStoriesRuns.id, runId))

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

      // Update run with error
      await db
        .update(schema.xpStoriesRuns)
        .set({
          status: 'failed',
          error: errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(schema.xpStoriesRuns.id, runId))

      return {
        success: false,
        sessionId: stagehand?.browserbaseSessionID ?? null,
        sessionRecordingUrl: null,
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
