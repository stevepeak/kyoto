import { findGitRoot } from '@app/shell'
import { appendFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { pwdKyoto } from '../config/find-kyoto-dir'

const LOG_FILENAME = 'cli.log'

let logFilePath: string | null = null
let initPromise: Promise<string | null> | null = null

async function resolveLogFile(): Promise<string | null> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const gitRoot = await findGitRoot()
        const fsPaths = await pwdKyoto(gitRoot)
        const filePath = join(fsPaths.cache, LOG_FILENAME)
        await writeFile(filePath, '', 'utf-8')
        logFilePath = filePath
        return filePath
      } catch {
        logFilePath = null
        return null
      }
    })()
  }

  return initPromise
}

/**
 * Truncates the CLI log file for the current invocation and ensures
 * the backing directory exists. Errors are swallowed to avoid impacting
 * the user experience when logging isn't available.
 */
export async function initializeCliLogFile(): Promise<void> {
  await resolveLogFile()
}

/**
 * Appends a line to the CLI log file. The file is initialized on first call.
 */
export async function appendCliLogLine(line: string): Promise<void> {
  const normalized =
    line.length === 0 ? '\n' : line.endsWith('\n') ? line : `${line}\n`

  try {
    const filePath = logFilePath ?? (await resolveLogFile())
    if (!filePath) {
      return
    }
    await appendFile(filePath, normalized, 'utf-8')
  } catch {
    // Intentionally ignore logging failures
  }
}
