import { task, logger, streams } from '@trigger.dev/sdk'
import { Stagehand } from '@browserbasehq/stagehand'
import { parseEnv } from '@app/config'
import { Experimental_Agent as Agent, stepCountIs, tool } from 'ai'
import { z } from 'zod'

function createActTool(ctx: {
  stagehand: Stagehand
  agent: ReturnType<Stagehand['agent']>
}) {
  return tool({
    name: 'act',
    description:
      'Perform individual actions on a web page. Use it to build self-healing and deterministic automations that adapt to website changes.',
    inputSchema: z.object({
      action: z
        .string()
        .min(1)
        .describe(
          'The action to perform on the web page (e.g., "Click the About button", "Fill in the email field").',
        ),
    }),
    execute: async (input) => {
      void streams.append('progress', `Act: ${input.action}`)
      const result = await ctx.stagehand.act(input.action)
      return JSON.stringify(result)
    },
  })
}

function createExtractTool(ctx: {
  stagehand: Stagehand
  agent: ReturnType<Stagehand['agent']>
}) {
  return tool({
    name: 'extract',
    description:
      'Grab structured data from a webpage. You can define your schema with zod (TypeScript) or JSON. If you do not want to define a schema, you can also call extract with just a natural language prompt, or call extract with no parameters.',
    inputSchema: z.object({
      prompt: z
        .string()
        .describe(
          'Optional natural language prompt describing what data to extract from the webpage. If not provided, extract will attempt to extract all structured data.',
        ),
      schema: z
        .any()
        .optional()
        .describe(
          'Optional Zod schema or JSON schema defining the structure of data to extract.',
        ),
    }),
    execute: async (input) => {
      void streams.append('progress', `Extracting ${input.prompt}`)
      const result = await ctx.stagehand.extract(
        input.prompt,
        input.schema ?? undefined,
      )
      return JSON.stringify(result)
    },
  })
}

function createObserveTool(ctx: {
  stagehand: Stagehand
  agent: ReturnType<Stagehand['agent']>
}) {
  return tool({
    name: 'observe',
    description:
      'Discover actionable elements on a page and returns structured actions you can execute or validate before acting. Use it to explore pages, plan multi-step workflows, cache actions, and validate elements before acting.',
    inputSchema: z.object({
      prompt: z
        .string()
        .describe(
          'Natural language prompt describing what to observe on the page. If not provided, observe will discover all actionable elements.',
        ),
    }),
    execute: async (input) => {
      void streams.append(
        'progress',
        `Observing the page with prompt: ${input.prompt}`,
      )
      const result = await ctx.stagehand.observe(input.prompt)
      return JSON.stringify(result)
    },
  })
}

function createAgentTool(ctx: {
  stagehand: Stagehand
  agent: ReturnType<Stagehand['agent']>
}) {
  return tool({
    name: 'agent',
    description:
      'Turn high level tasks into fully autonomous browser workflows. You can customize the agent by specifying the LLM provider and model, setting custom instructions for behavior, and configuring max steps.',
    inputSchema: z.object({
      task: z
        .string()
        .min(1)
        .describe(
          'The high-level task to execute as a fully autonomous browser workflow.',
        ),
    }),
    execute: async (input) => {
      void streams.append('progress', `Agent should ${input.task}`)
      const result = await ctx.agent.execute(input.task)
      return JSON.stringify(result)
    },
  })
}

function createGotoTool(ctx: {
  stagehand: Stagehand
  agent: ReturnType<Stagehand['agent']>
}) {
  return tool({
    name: 'goto',
    description:
      'Navigate the browser to a specific URL. Use this to load a webpage before performing actions or extracting data.',
    inputSchema: z.object({
      url: z
        .string()
        .url()
        .describe('The URL to navigate to (e.g., "https://example.com").'),
    }),
    execute: async (input) => {
      void streams.append('progress', `Navigating to ${input.url}`)
      const page = ctx.stagehand.context.pages()[0]
      await page.goto(input.url)
      return JSON.stringify({ success: true, url: input.url })
    },
  })
}

export const browserbaseTestTask = task({
  id: 'browserbase-test',
  run: async (args: { prompt: string }): Promise<{ output: string }> => {
    const env = parseEnv()

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

      const ctx = { stagehand, agent: stagehandAgent }

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
