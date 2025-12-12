import { findGitRoot } from '@app/shell'
import { readFile } from 'node:fs/promises'

import { pwdKyoto } from './find-kyoto-dir'
import { schema } from './get'

/**
 * Safely checks if the user is logged in by verifying that a valid session token exists.
 * Does not throw errors - returns false if config is missing or invalid.
 *
 * @returns true if user has a valid session token, false otherwise
 */
export async function isLoggedIn(): Promise<boolean> {
  try {
    const gitRoot = await findGitRoot()
    const { config: configPath } = await pwdKyoto(gitRoot)
    const content = await readFile(configPath, 'utf-8')
    const config = schema.parse(JSON.parse(content))

    // Check if user session token exists and is not empty
    return (
      config.user?.sessionToken !== undefined &&
      typeof config.user.sessionToken === 'string' &&
      config.user.sessionToken.length > 0
    )
  } catch {
    // Config file doesn't exist, is invalid, or user is not logged in
    return false
  }
}
