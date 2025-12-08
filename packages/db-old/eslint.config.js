import { config } from '@kyoto/eslint-config/bun.js'

/** @type {import("eslint").Linter.Config[]} */

export default [
  ...config,
  {
    ignores: ['**/*.gen.ts', '**/*.gen.js'],
  },
]
