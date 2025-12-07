import { findGitRoot } from '@app/shell'
import { Command } from '@oclif/core'
import chalk from 'chalk'
import { resolve } from 'node:path'
import terminalLink from 'terminal-link'

import { assertCliPrerequisites } from '../helpers/config/assert-cli-prerequisites.js'
import { displayHeader } from '../helpers/display/display-header.js'
import { readAllStoryFiles } from '../helpers/file/reader.js'

export default class List extends Command {
  static override description = 'List all stories'

  static override hiddenAliases: string[] = ['ls']

  static override examples = ['$ kyoto list', '$ kyoto ls']

  override async run(): Promise<void> {
    await this.parse(List)

    const logger = (message: string) => {
      this.log(message)
    }

    try {
      // Assert prerequisites: git repository (no AI env vars needed for list)
      await assertCliPrerequisites({ requireAi: false })

      // Show stage header with red kanji
      displayHeader({ logger })

      // Read all story files
      const storyFiles = await readAllStoryFiles()

      if (storyFiles.length === 0) {
        logger(
          chalk.hex('#c27a52')(
            `\n⚠️  No story files found in .kyoto/stories directory.\n`,
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
      const gitRoot = await findGitRoot()
      for (const storyFile of storyFiles) {
        const absolutePath = resolve(gitRoot, storyFile.path)
        const linkUrl = `vscode://file/${absolutePath}`
        const styledTitle = chalk.bold.hex('#7ba179')(storyFile.story.title)
        const titleLink = terminalLink(styledTitle, linkUrl)
        logger(titleLink)
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
