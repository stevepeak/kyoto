#!/usr/bin/env bun

import './instrument.js'

import { execute } from '@oclif/core'

const scriptDir = import.meta.dir
try {
  await execute({ development: true, dir: scriptDir })
  // Set exit code and let the event loop drain to ensure all I/O is flushed
  process.exitCode = 0
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (e) {
  process.exitCode = 1
}
