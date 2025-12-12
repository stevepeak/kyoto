import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

interface AuthConfig {
  sessionToken: string
  userLogin?: string
  appUrl?: string
  createdAt?: string
}

/**
 * Writes/merges auth info into `.kyoto/config.json`.
 *
 * Note: This intentionally does NOT validate the full config schema, since
 * login should work even if `kyoto setup` hasn't been run yet.
 */
export async function updateAuthConfigJson(args: {
  configPath: string
  auth: AuthConfig
}): Promise<void> {
  let configToWrite: Record<string, unknown> = {}

  try {
    const content = await readFile(args.configPath, 'utf-8')
    configToWrite = JSON.parse(content) as Record<string, unknown>
  } catch {
    configToWrite = {}
  }

  configToWrite.auth = {
    ...(typeof configToWrite.auth === 'object' && configToWrite.auth !== null
      ? (configToWrite.auth as Record<string, unknown>)
      : {}),
    ...args.auth,
  }

  const kyotoDir = dirname(args.configPath)
  await mkdir(kyotoDir, { recursive: true })

  await writeFile(
    args.configPath,
    JSON.stringify(configToWrite, null, 2) + '\n',
    'utf-8',
  )
}

