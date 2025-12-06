import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'
import ora from 'ora'

import { readAllStoryFilesRecursively } from '../helpers/story-file-reader.js'
import { findDuplicates } from '../helpers/story-dedupe.js'
import { deleteStoryFile } from '../helpers/file-organizer.js'
import { displayHeader } from '../helpers/display-header.js'
import { assertCliPrerequisites } from '../helpers/assert-cli-prerequisites.js'

function formatStoryFilename(filename: string): string {
  return filename
    .replace(/\.json$/, '') // remove extension
    .replace(/-/g, ' ') // replace dashes with spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()) // capitalize first letter of each word
}

export default class Dedupe extends Command {
  static override description =
    'Find and eliminate duplicate stories using semantic similarity'

  static override examples = [
    '$ kyoto dedupe',
    '$ kyoto dedupe --threshold 0.85',
  ]

  static override flags = {
    threshold: Flags.string({
      description:
        'Similarity threshold (0.0-1.0, default: 0.85). Higher values mean more similar stories are required to be considered duplicates.',
      default: '0.85',
    }),
  }

  override async run(): Promise<void> {
    const { flags } = await this.parse(Dedupe)

    // Create a logger that uses oclif's log method (passes through colored messages)
    const logger = (message: string) => {
      this.log(message)
    }

    try {
      // Assert prerequisites: environment variables and git repository
      await assertCliPrerequisites()

      // Show stage header
      displayHeader({ logger })

      // Parse threshold
      const threshold = parseFloat(flags.threshold ?? '0.85')
      if (isNaN(threshold) || threshold < 0 || threshold > 1) {
        logger(
          chalk.hex('#c27a52')(
            `\n⚠️  Invalid threshold: ${flags.threshold}. Must be between 0.0 and 1.0\n`,
          ),
        )
        this.exit(1)
        return
      }

      // Read all story files recursively
      const readSpinner = ora({
        text: chalk.white('Reading story files...'),
        spinner: 'squareCorners',
        color: 'red',
      }).start()

      const storyFiles = await readAllStoryFilesRecursively()

      if (storyFiles.length === 0) {
        readSpinner.fail(chalk.white('No story files found'))
        logger(
          chalk.hex('#c27a52')(
            `\n⚠️  No story files found in .kyoto/stories\n`,
          ),
        )
        return
      }

      readSpinner.succeed(
        chalk.white(
          `Found ${chalk.hex('#7ba179')(storyFiles.length.toString())} ${storyFiles.length === 1 ? 'story file' : 'story files'}`,
        ),
      )

      logger(
        chalk.grey(
          `• Similarity threshold: ${chalk.hex('#7b301f')(threshold.toString())}`,
        ),
      )

      if (storyFiles.length < 2) {
        logger(
          chalk.hex('#7ba179')(
            `\n✓ No duplicates possible with only ${storyFiles.length} ${storyFiles.length === 1 ? 'file' : 'files'}\n`,
          ),
        )
        return
      }

      // Find duplicates
      const duplicateSpinner = ora({
        text: chalk.white('Analyzing stories for duplicates...'),
        spinner: 'squareCorners',
        color: 'red',
      }).start()

      const { groups, toDelete } = await findDuplicates(
        storyFiles,
        threshold,
        (progress) => {
          duplicateSpinner.text =
            chalk.white('Analyzing... ') + chalk.grey(progress)
        },
      )

      if (groups.length === 0) {
        duplicateSpinner.succeed(chalk.white('No duplicates found'))
        logger(chalk.hex('#7ba179')(`✓ All stories are unique enough`))
        return
      }

      duplicateSpinner.succeed(
        chalk.white(
          `Found ${chalk.hex('#7ba179')(groups.length.toString())} ${groups.length === 1 ? 'duplicate group' : 'duplicate groups'}`,
        ),
      )

      // Show duplicate groups
      logger(chalk.grey('\n• Duplicate groups found:\n'))
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i]!
        logger(chalk.grey(`Group ${i + 1}:`))
        for (const file of group) {
          const formattedName = formatStoryFilename(file.filename)
          logger(chalk.grey(`  - ${chalk.white(formattedName)} (${file.path})`))
        }
        logger('')
      }

      if (toDelete.length === 0) {
        logger(
          chalk.hex('#7ba179')(
            `\n✓ No files to delete (all duplicates already resolved)\n`,
          ),
        )
        return
      }

      // Delete duplicate files
      logger(
        chalk.grey(
          `\n• Deleting ${chalk.hex('#7b301f')(toDelete.length.toString())} ${toDelete.length === 1 ? 'duplicate file' : 'duplicate files'}...\n`,
        ),
      )

      let deletedCount = 0
      let failedCount = 0

      for (const file of toDelete) {
        const formattedName = formatStoryFilename(file.filename)
        const deleteSpinner = ora({
          text: chalk.white(formattedName),
          spinner: 'squareCorners',
          color: 'red',
        }).start()

        try {
          await deleteStoryFile(file.path)
          deleteSpinner.succeed(
            chalk.white(`${formattedName} - ${chalk.grey('deleted')}`),
          )
          deletedCount++
        } catch (error) {
          deleteSpinner.fail(chalk.white(formattedName))
          logger(
            chalk.hex('#c27a52')(
              `\n⚠️  Failed to delete file: ${formattedName}\n`,
            ),
          )
          if (error instanceof Error) {
            logger(chalk.hex('#7c6653')(`Error: ${error.message}\n`))
          }
          failedCount++
        }
      }

      // Summary
      if (deletedCount > 0) {
        logger(
          chalk.hex('#7ba179')(
            `\n✓ Deleted ${deletedCount} ${deletedCount === 1 ? 'duplicate file' : 'duplicate files'}\n`,
          ),
        )
      }

      if (failedCount > 0) {
        logger(
          chalk.hex('#c27a52')(
            `\n⚠️  Failed to delete ${failedCount} ${failedCount === 1 ? 'file' : 'files'}\n`,
          ),
        )
      }
    } catch (error) {
      if (error instanceof Error) {
        // Check if it's a file validation error
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
        this.error('Failed to dedupe stories', { exit: 1 })
      }
    }
  }
}
