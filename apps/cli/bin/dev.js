#!/usr/bin/env bun

import './instrument.js'

import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../../../.env') })

import { execute } from '@oclif/core'

const scriptDir = import.meta.dir
try {
  await execute({ development: true, dir: scriptDir })
  process.exit(0)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (e) {
  process.exit(1)
}
