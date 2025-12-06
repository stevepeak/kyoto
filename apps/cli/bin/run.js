#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { execute } from '@oclif/core'
import { fileURLToPath } from 'node:url'
import CustomHelp from '../dist/help.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Find project root by walking up from current directory or CLI directory
function findProjectRoot() {
  // Start from either process.cwd() or the CLI directory
  const currentDir = process.cwd()
  const cliDir = dirname(__dirname)

  // Try process.cwd() first, then fall back to CLI directory
  for (const startDir of [currentDir, cliDir]) {
    let dir = startDir
    while (dir !== dirname(dir)) {
      // Look for pnpm-workspace.yaml as marker of project root
      if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
        return dir
      }
      dir = dirname(dir)
    }
  }

  // Fallback to process.cwd() if we can't find the root
  return process.cwd()
}

await execute({
  development: false,
  dir: join(__dirname, '..'),
  helpClass: CustomHelp,
})
