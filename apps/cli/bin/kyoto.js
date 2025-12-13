#!/usr/bin/env bun

import { run } from '../dist/cli.js'

try {
  await run(process.argv)
  process.exitCode = process.exitCode ?? 0
} catch {
  process.exitCode = 1
}
