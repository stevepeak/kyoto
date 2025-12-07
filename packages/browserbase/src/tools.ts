import { type Stagehand } from '@browserbasehq/stagehand'
import { tool } from 'ai'
import { z } from 'zod'

export interface BrowserbaseToolsContext {
  stagehand: Stagehand
  agent: ReturnType<Stagehand['agent']>
  onProgress?: (message: string) => void
}

export function createActTool(ctx: BrowserbaseToolsContext) {
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
      if (ctx.onProgress) {
        ctx.onProgress(`Act: ${input.action}`)
      }
      const result = await ctx.stagehand.act(input.action)
      return JSON.stringify(result)
    },
  })
}

export function createExtractTool(ctx: BrowserbaseToolsContext) {
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
      if (ctx.onProgress) {
        ctx.onProgress(`Extracting ${input.prompt}`)
      }
      const result = await ctx.stagehand.extract(
        input.prompt,
        input.schema ?? undefined,
      )
      return JSON.stringify(result)
    },
  })
}

export function createObserveTool(ctx: BrowserbaseToolsContext) {
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
      if (ctx.onProgress) {
        ctx.onProgress(`Observing the page with prompt: ${input.prompt}`)
      }
      const result = await ctx.stagehand.observe(input.prompt)
      return JSON.stringify(result)
    },
  })
}

export function createAgentTool(ctx: BrowserbaseToolsContext) {
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
      if (ctx.onProgress) {
        ctx.onProgress(`Agent should ${input.task}`)
      }
      const result = await ctx.agent.execute(input.task)
      return JSON.stringify(result)
    },
  })
}

export function createGotoTool(ctx: BrowserbaseToolsContext) {
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
      if (ctx.onProgress) {
        ctx.onProgress(`Navigating to ${input.url}`)
      }
      const page = ctx.stagehand.context.pages()[0]
      await page.goto(input.url)
      return JSON.stringify({ success: true, url: input.url })
    },
  })
}
