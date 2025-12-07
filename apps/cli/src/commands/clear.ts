import { Command } from '@oclif/core'
import chalk from 'chalk'
import { rm, stat } from 'node:fs/promises'
import { join } from 'node:path'

import { assertCliPrerequisites } from '../helpers/config/assert-cli-prerequisites.js'
import { pwdKyoto } from '../helpers/config/find-kyoto-dir.js'
import { displayHeader } from '../helpers/display/display-header.js'

export default class Clear extends Command {
  static override description =
    'Clear all stories and vectra data, preserving details.json'

  static override examples = ['$ kyoto clear']

  override async run(): Promise<void> {
    await this.parse(Clear)

    const logger = (message: string) => {
      this.log(message)
    }

    try {
      // Assert prerequisites: git repository (no AI env vars needed for clear)
      await assertCliPrerequisites({ requireAi: false })

      // Show stage header
      displayHeader({ logger })

      // Get Kyoto directory paths
      const { stories, root } = await pwdKyoto()

      // Delete stories directory if it exists
      try {
        await stat(stories)
        await rm(stories, { recursive: true, force: true })
        logger(chalk.hex('#7ba179')('✓ Deleted stories directory'))
      } catch (error) {
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT'
        ) {
          logger(chalk.grey('Stories directory does not exist, skipping'))
        } else {
          throw error
        }
      }

      // Delete vectra directory if it exists
      const vectraParentDir = join(root, '.vectra')
      try {
        await stat(vectraParentDir)
        await rm(vectraParentDir, { recursive: true, force: true })
        logger(chalk.hex('#7ba179')('✓ Deleted vectra data directory'))
      } catch (error) {
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT'
        ) {
          logger(chalk.grey('Vectra directory does not exist, skipping'))
        } else {
          throw error
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        // Check if it's a directory not found error
        if (
          error.message.includes('not found') ||
          error.message.includes('.kyoto directory not found')
        ) {
          logger(chalk.hex('#c27a52')(`\n⚠️  ${error.message}\n`))
          this.exit(1)
          return
        }
        // For other errors, use the default error handler
        this.error(error.message, { exit: 1 })
      } else {
        this.error('Failed to clear stories and vectra data', { exit: 1 })
      }
    }
  }
}
