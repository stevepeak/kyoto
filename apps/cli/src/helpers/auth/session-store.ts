import { findGitRoot } from '@app/shell'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'

import { pwdKyoto } from '../config/find-kyoto-dir'

const schema = z.object({
  webUrl: z.string(),
  token: z.string(),
  login: z.string().optional(),
  createdAtMs: z.number().optional(),
})

export type CliAuthSession = z.infer<typeof schema>

async function getAuthPath(): Promise<string> {
  const gitRoot = await findGitRoot()
  const kyoto = await pwdKyoto(gitRoot)
  return join(kyoto.root, 'auth.json')
}

export async function readCliAuthSession(): Promise<CliAuthSession | null> {
  const authPath = await getAuthPath()
  try {
    const content = await readFile(authPath, 'utf-8')
    const parsed: unknown = JSON.parse(content)
    return schema.parse(parsed)
  } catch {
    return null
  }
}

export async function writeCliAuthSession(args: CliAuthSession): Promise<void> {
  const authPath = await getAuthPath()
  await writeFile(authPath, JSON.stringify(args, null, 2) + '\n', 'utf-8')
}
