#!/usr/bin/env bun

import { run } from '../src/cli.tsx'

try {
  await run(process.argv)
  process.exitCode = process.exitCode ?? 0
} catch {
  process.exitCode = 1
}
