// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook'

import { config } from '@kyoto/eslint-config/bun.js'

/** @type {import("eslint").Linter.Config[]} */

export default [
  ...config,
  {
    ignores: ['components/ui/**', '.next/**'],
  },
  ...storybook.configs['flat/recommended'],
]
