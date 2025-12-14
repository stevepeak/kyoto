import { type Tool, tool } from 'ai'
import { z } from 'zod'

import { type PlaywrightContext } from './browser'

export type PlaywrightToolsConfig = {
  ctx: PlaywrightContext
  onProgress?: (message: string) => void
}

export function createGotoTool(config: PlaywrightToolsConfig): Tool {
  return tool({
    name: 'goto',
    description:
      'Navigate the browser to a specific URL. Use this to load a webpage before performing actions.',
    inputSchema: z.object({
      url: z
        .string()
        .url()
        .describe('The URL to navigate to (e.g., "http://localhost:3000").'),
    }),
    execute: async (input) => {
      config.onProgress?.(`Navigating to ${input.url}`)
      await config.ctx.page.goto(input.url, { waitUntil: 'networkidle' })
      const title = await config.ctx.page.title()
      return JSON.stringify({ success: true, url: input.url, title })
    },
  })
}

export function createClickTool(config: PlaywrightToolsConfig): Tool {
  return tool({
    name: 'click',
    description:
      'Click an element on the page. Use CSS selectors, text content, or accessibility labels to identify elements.',
    inputSchema: z.object({
      selector: z
        .string()
        .describe(
          'CSS selector, text content (e.g., "text=Submit"), or role selector (e.g., "role=button[name=Submit]").',
        ),
    }),
    execute: async (input) => {
      config.onProgress?.(`Clicking: ${input.selector}`)
      await config.ctx.page.click(input.selector)
      return JSON.stringify({ success: true, clicked: input.selector })
    },
  })
}

export function createTypeTool(config: PlaywrightToolsConfig): Tool {
  return tool({
    name: 'type',
    description: 'Type text into an input field or editable element.',
    inputSchema: z.object({
      selector: z
        .string()
        .describe('CSS selector or text selector for the input element.'),
      text: z.string().describe('The text to type into the element.'),
      clear: z
        .boolean()
        .optional()
        .describe(
          'Whether to clear the field before typing. Defaults to true.',
        ),
    }),
    execute: async (input) => {
      config.onProgress?.(`Typing into ${input.selector}`)
      const element = config.ctx.page.locator(input.selector)
      if (input.clear !== false) {
        await element.clear()
      }
      await element.fill(input.text)
      return JSON.stringify({
        success: true,
        selector: input.selector,
        typed: input.text,
      })
    },
  })
}

export function createScreenshotTool(config: PlaywrightToolsConfig): Tool {
  return tool({
    name: 'screenshot',
    description:
      'Take a screenshot of the current page or a specific element. Returns the screenshot as base64.',
    inputSchema: z.object({
      selector: z
        .string()
        .optional()
        .describe('Optional CSS selector to screenshot a specific element.'),
      fullPage: z
        .boolean()
        .optional()
        .describe(
          'Whether to capture the full scrollable page. Defaults to false.',
        ),
    }),
    execute: async (input) => {
      config.onProgress?.('Taking screenshot')
      let screenshot: Buffer
      if (input.selector) {
        screenshot = await config.ctx.page.locator(input.selector).screenshot()
      } else {
        screenshot = await config.ctx.page.screenshot({
          fullPage: input.fullPage ?? false,
        })
      }
      return JSON.stringify({
        success: true,
        screenshot: screenshot.toString('base64'),
        format: 'png',
      })
    },
  })
}

export function createObserveTool(config: PlaywrightToolsConfig): Tool {
  return tool({
    name: 'observe',
    description:
      'Get the current page state including URL, title, and visible text content. Use this to understand what is on the page.',
    inputSchema: z.object({}),
    execute: async () => {
      config.onProgress?.('Observing page state')
      const url = config.ctx.page.url()
      const title = await config.ctx.page.title()

      // Get the page content as text
      const bodyText = await config.ctx.page.locator('body').textContent()

      return JSON.stringify({
        url,
        title,
        bodyText: bodyText?.slice(0, 5000), // Limit to prevent huge responses
      })
    },
  })
}

export function createWaitForTool(config: PlaywrightToolsConfig): Tool {
  return tool({
    name: 'waitFor',
    description:
      'Wait for an element to appear, disappear, or for a specific condition.',
    inputSchema: z.object({
      selector: z.string().describe('CSS selector to wait for.'),
      state: z
        .enum(['attached', 'detached', 'visible', 'hidden'])
        .optional()
        .describe('The state to wait for. Defaults to "visible".'),
      timeout: z
        .number()
        .optional()
        .describe('Maximum time to wait in milliseconds. Defaults to 30000.'),
    }),
    execute: async (input) => {
      config.onProgress?.(`Waiting for ${input.selector}`)
      await config.ctx.page.locator(input.selector).waitFor({
        state: input.state ?? 'visible',
        timeout: input.timeout ?? 30000,
      })
      return JSON.stringify({
        success: true,
        selector: input.selector,
        state: input.state ?? 'visible',
      })
    },
  })
}

export function createGetTextTool(config: PlaywrightToolsConfig): Tool {
  return tool({
    name: 'getText',
    description:
      'Get the text content of an element or multiple elements matching a selector.',
    inputSchema: z.object({
      selector: z
        .string()
        .describe('CSS selector for the element(s) to get text from.'),
      all: z
        .boolean()
        .optional()
        .describe(
          'Whether to get text from all matching elements. Defaults to false (first only).',
        ),
    }),
    execute: async (input) => {
      config.onProgress?.(`Getting text from ${input.selector}`)
      if (input.all) {
        const texts = await config.ctx.page
          .locator(input.selector)
          .allTextContents()
        return JSON.stringify({ texts })
      }
      const text = await config.ctx.page.locator(input.selector).textContent()
      return JSON.stringify({ text })
    },
  })
}

export function createPressKeyTool(config: PlaywrightToolsConfig): Tool {
  return tool({
    name: 'pressKey',
    description:
      'Press a keyboard key or key combination (e.g., "Enter", "Escape", "Control+a").',
    inputSchema: z.object({
      key: z
        .string()
        .describe(
          'The key to press (e.g., "Enter", "Tab", "Escape", "Control+a").',
        ),
    }),
    execute: async (input) => {
      config.onProgress?.(`Pressing key: ${input.key}`)
      await config.ctx.page.keyboard.press(input.key)
      return JSON.stringify({ success: true, key: input.key })
    },
  })
}

/**
 * Creates all Playwright tools for browser interaction.
 */
export function createPlaywrightTools(config: PlaywrightToolsConfig) {
  return {
    goto: createGotoTool(config),
    click: createClickTool(config),
    type: createTypeTool(config),
    screenshot: createScreenshotTool(config),
    observe: createObserveTool(config),
    waitFor: createWaitForTool(config),
    getText: createGetTextTool(config),
    pressKey: createPressKeyTool(config),
  }
}
