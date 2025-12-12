import { findGitRoot } from '@app/shell'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { type z } from 'zod'

import { pwdKyoto } from './find-kyoto-dir'
import { type Config, schema } from './get'

const patchSchema = schema.deepPartial()
type ConfigPatch = z.input<typeof patchSchema>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMerge(base: unknown, patch: unknown): unknown {
  if (patch === undefined) return base
  if (!isRecord(base) || !isRecord(patch)) return patch

  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    out[key] = deepMerge(base[key], value)
  }
  return out
}

export async function updateConfig(update: ConfigPatch): Promise<Config> {
  const gitRoot = await findGitRoot()
  const { config: configPath } = await pwdKyoto(gitRoot)

  // Load current config.json (best effort) and validate it
  let existing: unknown = {}
  try {
    const content = await readFile(configPath, 'utf-8')
    let json: unknown = null
    try {
      json = JSON.parse(content)
    } catch {
      json = null
    }
    const parsed = schema.safeParse(json)
    existing = parsed.success ? parsed.data : {}
  } catch {
    existing = {}
  }

  const patch = patchSchema.parse(update)
  const updatedConfig = deepMerge(existing, patch)
  const config = schema.parse(updatedConfig)

  // Ensure .kyoto directory exists
  await mkdir(dirname(configPath), { recursive: true })

  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
  return config
}
