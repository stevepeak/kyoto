import { existsSync } from 'node:fs'
import {
  type Browser,
  type BrowserContext,
  chromium,
  type Page,
} from 'playwright'

export type PlaywrightContext = {
  browser: Browser
  context: BrowserContext
  page: Page
  /** Called when browser is closed by user */
  onDisconnected: (callback: () => void) => void
  /** Path to storage state file for saving on close */
  storageStatePath?: string
}

export type LaunchBrowserOptions = {
  /** Path to storage state file to load (if exists) and save to on close */
  storageStatePath?: string
}

/**
 * Launches a local Chromium browser in headed mode.
 * Returns the browser, context, and page for use with tools.
 *
 * @param options.storageStatePath - Path to storage state file. If exists, will be loaded.
 *                                   Will be saved to this path when browser closes.
 */
export async function launchBrowser(
  options?: LaunchBrowserOptions,
): Promise<PlaywrightContext> {
  const browser = await chromium.launch({
    headless: false,
  })

  // Load existing storage state if file exists
  const storageState =
    options?.storageStatePath && existsSync(options.storageStatePath)
      ? options.storageStatePath
      : undefined

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    storageState,
  })

  const page = await context.newPage()

  // Allow registering a callback for when browser is closed by user
  const onDisconnected = (callback: () => void): void => {
    browser.on('disconnected', callback)
  }

  return {
    browser,
    context,
    page,
    onDisconnected,
    storageStatePath: options?.storageStatePath,
  }
}

/**
 * Closes the browser and cleans up resources.
 * If storageStatePath was provided when launching, saves the browser state.
 */
export async function closeBrowser(ctx: PlaywrightContext): Promise<void> {
  // Save storage state if path was provided
  if (ctx.storageStatePath) {
    await ctx.context.storageState({ path: ctx.storageStatePath })
  }

  await ctx.context.close()
  await ctx.browser.close()
}
