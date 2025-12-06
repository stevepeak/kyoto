import { task, logger, streams } from '@trigger.dev/sdk'
import { Stagehand } from '@browserbasehq/stagehand'
import { getConfig } from '@app/config'
import { Experimental_Agent as Agent, stepCountIs } from 'ai'
import {
  createActTool,
  createExtractTool,
  createObserveTool,
  createAgentTool,
  createGotoTool,
} from '@app/browserbase'

export const browserbaseTestTask = task({
  id: 'browserbase-test',
  run: async (args: { prompt: string }): Promise<{ output: string }> => {
    const env = getConfig()

    logger.log('Creating Stagehand')
    const stagehand = new Stagehand({
      env: 'BROWSERBASE',
      projectId: env.BROWSERBASE_PROJECT_ID,
      apiKey: env.BROWSERBASE_API_KEY,
      disablePino: true,
    })

    // Agent instance for use with exported tools (createActTool, createExtractTool, etc.)
    const stagehandAgent = stagehand.agent({
      cua: true,
      model: 'google/gemini-2.5-computer-use-preview-10-2025',
      systemPrompt:
        "You're a helpful assistant that can control a web browser.",
    })

    try {
      logger.log('Initializing Stagehand')
      await stagehand.init()

      console.log(`Stagehand Session Started`)
      console.log(
        `📽️ Watch live: https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`,
      )

      const ctx = {
        stagehand,
        agent: stagehandAgent,
        onProgress: (message: string) => {
          void streams.append('progress', message)
        },
      }

      const agent = new Agent({
        model: 'openai/gpt-5-mini',
        system: 'This is mostly a test of browser functionality.',
        tools: {
          act: createActTool(ctx),
          extract: createExtractTool(ctx),
          observe: createObserveTool(ctx),
          agent: createAgentTool(ctx),
          goto: createGotoTool(ctx),
        },
        stopWhen: stepCountIs(10),
        onStepFinish: (step) => {
          if (step.reasoningText) {
            void streams.append('progress', step.reasoningText)
          }
          logger.log('onStepFinish', { step })
        },
      })

      const result = await agent.generate({
        prompt:
          args.prompt ||
          'Goto https://usekyoto.com, click on the about button and extract the value proposition.',
      })
      const output = Array.isArray(result.content)
        ? result.content
            .map((part) => {
              if (typeof part === 'string') {
                return part
              }
              if ('text' in part && typeof part.text === 'string') {
                return part.text
              }
              return ''
            })
            .join('')
        : JSON.stringify(result.content)
      return { output }
    } finally {
      await stagehand.close()
    }
  },
})
