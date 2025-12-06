import { Command } from '@oclif/core'
import chalk from 'chalk'
import { resolve } from 'node:path'
import { readdir } from 'node:fs/promises'
import terminalLink from 'terminal-link'
import { readAllStoryFilesRecursively } from '../helpers/story-file-reader.js'
import { displayHeader } from '../helpers/display-header.js'
import { assertCliPrerequisites } from '../helpers/assert-cli-prerequisites.js'
import { findGitRoot, pwdKyoto } from '../helpers/find-kyoto-dir.js'
import { displayStoryTree } from '../helpers/display-story-tree.js'

export default class List extends Command {
  static override description = 'List all stories'

  static override aliases = ['ls']

  static override examples = ['$ kyoto list', '$ kyoto ls']

  override async run(): Promise<void> {
    const logger = (message: string) => {
      this.log(message)
    }

    try {
      // Assert prerequisites: git repository (no AI env vars needed for list)
      await assertCliPrerequisites({ requireAi: false })

      // Show stage header with red kanji
      displayHeader({ logger })

      // Read all story files recursively
      const storyFiles = await readAllStoryFilesRecursively()

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

      // Check if stories are organized (have directories) and display tree structure
      try {
        const { stories: storiesDir } = await pwdKyoto()
        const entries = await readdir(storiesDir, { withFileTypes: true })
        const hasDirectories = entries.some((entry) => entry.isDirectory())

        if (hasDirectories) {
          await displayStoryTree(logger)
        }
      } catch {
        // Silently fail if we can't check for directories
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
