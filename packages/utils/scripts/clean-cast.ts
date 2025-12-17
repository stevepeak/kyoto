#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'node:fs'
import { cleanAsciicast } from '../src/clean-asciicast'

const inputPath = process.argv[2]
const outputPath =
  process.argv[3] || inputPath.replace(/\.cast$/, '.cleaned.cast')

if (!inputPath) {
  console.error('Usage: bun clean-cast.ts <input.cast> [output.cast]')
  process.exit(1)
}

try {
  const content = readFileSync(inputPath, 'utf-8')
  const cleaned = cleanAsciicast({ content })
  writeFileSync(outputPath, cleaned, 'utf-8')
  console.log(`Cleaned asciicast written to: ${outputPath}`)
  console.log(`View with: asciinema play ${outputPath}`)
} catch (error) {
  console.error('Error:', error)
  process.exit(1)
}
