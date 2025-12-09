import { Experimental_Agent as Agent, stepCountIs, tool } from 'ai'
import { Box, Text, useApp } from 'ink'
import { chromium, type Page } from 'playwright'
import React, { useEffect, useState } from 'react'
import { dedent } from 'ts-dedent'
import { z } from 'zod'

import { getModel } from '../../helpers/config/get-model'
import { Header } from '../../helpers/display/display-header'
import { useCliLogger } from '../../helpers/logging/logger'

// Browser tools context
interface BrowserToolsContext {
  page: Page
  onProgress?: (message: string) => void
}

// Create browser interaction tools
function createGotoTool(ctx: BrowserToolsContext) {
  return tool({
    name: 'goto',
    description:
      'Navigate the browser to a specific URL. Use this to load a webpage before performing actions.',
    inputSchema: z.object({
      url: z
        .string()
        .url()
        .describe('The URL to navigate to (e.g., "http://localhost:3002").'),
      waitUntil: z
        .enum(['load', 'domcontentloaded', 'networkidle', 'commit'])
        .optional()
        .default('domcontentloaded')
        .describe('When to consider navigation succeeded'),
    }),
    execute: async (input) => {
      if (ctx.onProgress) {
        ctx.onProgress(`Navigating to ${input.url}...`)
      }
      await ctx.page.goto(input.url, {
        waitUntil: input.waitUntil,
      })
      return JSON.stringify({ success: true, url: input.url })
    },
  })
}

function createClickTool(ctx: BrowserToolsContext) {
  return tool({
    name: 'click',
    description:
      'Click on an element on the page. You can specify by role, text, or selector.',
    inputSchema: z.object({
      selector: z
        .string()
        .optional()
        .describe('CSS selector for the element to click'),
      role: z
        .enum(['button', 'link', 'textbox', 'checkbox', 'radio'])
        .optional()
        .describe('ARIA role of the element to click'),
      text: z
        .string()
        .optional()
        .describe('Text content to match for the element'),
      timeout: z.number().optional().default(5000).describe('Timeout in ms'),
    }),
    execute: async (input) => {
      if (ctx.onProgress) {
        ctx.onProgress(
          `Clicking ${input.role || input.text || input.selector || 'element'}...`,
        )
      }

      try {
        if (input.role) {
          const element = ctx.page.getByRole(input.role, {
            name: input.text ? new RegExp(input.text, 'i') : undefined,
          })
          await element.first().click({ timeout: input.timeout })
        } else if (input.text) {
          await ctx.page.getByText(new RegExp(input.text, 'i')).first().click({
            timeout: input.timeout,
          })
        } else if (input.selector) {
          await ctx.page.click(input.selector, { timeout: input.timeout })
        } else {
          throw new Error('Must provide selector, role, or text')
        }
        return JSON.stringify({ success: true })
      } catch (err) {
        return JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    },
  })
}

function createWaitForURLTool(ctx: BrowserToolsContext) {
  return tool({
    name: 'waitForURL',
    description:
      'Wait for the page URL to match a pattern. Useful for waiting for redirects.',
    inputSchema: z.object({
      pattern: z
        .string()
        .describe(
          'URL pattern to wait for (regex pattern, e.g., "github\\.com/.*login")',
        ),
      timeout: z.number().optional().default(15000).describe('Timeout in ms'),
    }),
    execute: async (input) => {
      if (ctx.onProgress) {
        ctx.onProgress(`Waiting for URL pattern: ${input.pattern}...`)
      }
      await ctx.page.waitForURL(new RegExp(input.pattern), {
        timeout: input.timeout,
      })
      return JSON.stringify({
        success: true,
        url: ctx.page.url(),
      })
    },
  })
}

function createGetPageInfoTool(ctx: BrowserToolsContext) {
  return tool({
    name: 'getPageInfo',
    description:
      'Get information about the current page (URL, title, visible text). Useful for understanding the current state.',
    inputSchema: z.object({}),
    execute: async () => {
      const url = ctx.page.url()
      const title = await ctx.page.title()
      const visibleText = await ctx.page.evaluate(() => {
        return document.body.innerText.slice(0, 500)
      })
      return JSON.stringify({
        url,
        title,
        visibleText,
      })
    },
  })
}

function createWaitTool(ctx: BrowserToolsContext) {
  return tool({
    name: 'wait',
    description: 'Wait for a specified amount of time in milliseconds.',
    inputSchema: z.object({
      ms: z.number().min(0).describe('Time to wait in milliseconds'),
    }),
    execute: async (input) => {
      if (ctx.onProgress) {
        ctx.onProgress(`Waiting ${input.ms}ms...`)
      }
      await new Promise((resolve) => setTimeout(resolve, input.ms))
      return JSON.stringify({ success: true })
    },
  })
}

interface TestBrowserProps {
  headless?: boolean
}

export default function TestBrowser({
  headless = false,
}: TestBrowserProps): React.ReactElement {
  const { exit } = useApp()
  const [status, setStatus] = useState('Starting...')
  const [error, setError] = useState<string | null>(null)
  const { logs, logger } = useCliLogger()

  useEffect(() => {
    let isMounted = true

    logger('Starting browser tests')

    const run = async (): Promise<void> => {
      let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null
      const gracefulExit = (): void => {
        setTimeout(() => {
          exit()
        }, 200)
      }

      try {
        if (!isMounted) return
        setStatus('Launching browser...')
        browser = await chromium.launch({ headless })
        const context = await browser.newContext()
        const page = await context.newPage()

        // Get model configuration
        const { model } = await getModel()

        // Create browser tools context
        const browserCtx: BrowserToolsContext = {
          page,
          onProgress: (message: string) => {
            if (isMounted) {
              setStatus(message)
              logger(message)
            }
          },
        }

        // Create tools
        const tools = {
          goto: createGotoTool(browserCtx),
          click: createClickTool(browserCtx),
          waitForURL: createWaitForURLTool(browserCtx),
          getPageInfo: createGetPageInfoTool(browserCtx),
          wait: createWaitTool(browserCtx),
        }

        // Create agent
        const agent = new Agent({
          model,
          system: dedent`
            You are a browser automation assistant. You can navigate web pages, click elements, and wait for conditions.
            Use the available tools to accomplish this task. Be thorough and check the page state when needed.
          `,
          tools,
          stopWhen: stepCountIs(10),
          onStepFinish: (step) => {
            if (step.reasoningText && isMounted) {
              setStatus(step.reasoningText)
            }
          },
        })

        if (!isMounted) return
        setStatus('Starting browser automation with AI agent...')
        logger('Starting browser automation with AI agent...')

        await agent.generate({
          prompt: dedent`
            Navigate to http://localhost:3002, click the login button, and verify we are redirected to the GitHub login page.
          `,
        })

        if (!isMounted) return
        setStatus('Test finished successfully')
        logger('Test finished successfully')
        gracefulExit()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to run browser test.'
        if (isMounted) {
          setError(message)
          logger(`Error: ${message}`)
        }
        process.exitCode = 1
        gracefulExit()
      } finally {
        if (browser) {
          try {
            await browser.close()
            browser = null
          } catch (closeErr) {
            if (closeErr instanceof Error && isMounted) {
              setError(
                closeErr.message ||
                  'Failed to close browser after running test.',
              )
              logger(
                closeErr.message ||
                  'Failed to close browser after running test.',
              )
            }
            process.exitCode = process.exitCode ?? 1
          }
        }
      }
    }

    void run()

    return () => {
      isMounted = false
    }
  }, [exit, headless, logger])

  return (
    <Box flexDirection="column">
      <Header message="Browser Tests" />
      <Text color={error ? 'red' : 'green'}>
        {error ? `Error: ${error}` : status}
      </Text>
      {logs.map((line) => (
        <React.Fragment key={line.key}>{line.content}</React.Fragment>
      ))}
    </Box>
  )
}
