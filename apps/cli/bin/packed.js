#!/usr/bin/env node

import { run } from '../dist/cli.js'

try {
  await run(process.argv)
  process.exitCode = process.exitCode ?? 0
} catch {
  process.exitCode = 1
}
