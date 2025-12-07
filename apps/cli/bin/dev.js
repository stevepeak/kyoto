#!/usr/bin/env bun

import './instrument.js'

import { execute } from '@oclif/core'

const scriptDir = import.meta.dir
try {
  await execute({ development: true, dir: scriptDir })
  process.exit(0)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (e) {
  process.exit(1)
}
