import { Command } from '@oclif/core'
import chalk from 'chalk'
import { readAllStoryFilesRecursively } from '../helpers/story-file-reader.js'
import { displayHeader } from '../helpers/display-header.js'

export default class List extends Command {
  static override description =
    'List all stories discovered from the .kyoto folder'

  static override examples = ['$ kyoto list']

  override async run(): Promise<void> {
    const logger = (message: string) => {
      this.log(message)
    }

    try {
      // Show stage header with red kanji
      displayHeader(logger)

      // Read all story files recursively
      const storyFiles = await readAllStoryFilesRecursively()

      if (storyFiles.length === 0) {
        logger(
          chalk.hex('#c27a52')(
            `\n⚠️  No story files found in .kyoto directory.\n`,
          ),
        )
        return
      }

      logger(
        chalk.grey(
          `• Found ${chalk.hex('#7b301f')(storyFiles.length.toString())} ${storyFiles.length === 1 ? 'story' : 'stories'}:\n`,
        ),
      )

      // Display each story
      for (const storyFile of storyFiles) {
        const path = storyFile.path.replace('.kyoto/', '')
        logger(
          chalk.white(
            `${chalk.hex('#7ba179')('•')} ${chalk.hex('#7ba179')(path)}`,
          ),
        )
        logger(chalk.grey(`${chalk.white(storyFile.story.title)}`))
        if (storyFile.story.behavior) {
          logger(chalk.grey(`${storyFile.story.behavior}`))
        }
        logger('') // Empty line between stories
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
        this.error('Failed to list stories', { exit: 1 })
      }
    }
  }
}
