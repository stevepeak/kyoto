import { findGitRoot } from '@app/shell'
import { Args, Command, Flags } from '@oclif/core'
import chalk from 'chalk'
import { resolve } from 'node:path'
import terminalLink from 'terminal-link'

import { assertCliPrerequisites } from '../helpers/config/assert-cli-prerequisites'
import { displayHeader } from '../helpers/display/display-header'
import { searchStories } from '../helpers/stories/search-stories'

export default class Search extends Command {
  static override description = 'Search for stories using semantic similarity'

  static override examples = [
    '$ kyoto search "user authentication"',
    '$ kyoto search "foobar" --limit 5',
    '$ kyoto search "foobar" --limit 10 --threshold 0.7',
  ]

  static override args = {
    query: Args.string({
      description: 'Search query to find relevant stories',
      required: true,
    }),
  }

  static override flags = {
    limit: Flags.integer({
      description: 'Maximum number of stories to return (default: 10)',
      char: 'k',
      default: 10,
    }),
    threshold: Flags.string({
      description:
        'Minimum similarity score threshold (0-1). Results below this threshold will be filtered out.',
      char: 't',
    }),
  }

  override async run(): Promise<void> {
    const { args, flags } = await this.parse(Search)
    const logger = (message: string) => {
      this.log(message)
    }

    try {
      // Assert prerequisites: git repository and AI configuration
      await assertCliPrerequisites({ requireAi: true })

      // Show header
      displayHeader({ logger })

      // Show search parameters
      logger(chalk.grey(`• Searching for: ${chalk.hex('#7b301f')(args.query)}`))
      if (flags.limit) {
        logger(
          chalk.grey(
            `• Limit: ${chalk.hex('#7b301f')(flags.limit.toString())}`,
          ),
        )
      }
      let thresholdValue: number | undefined
      if (flags.threshold) {
        thresholdValue = parseFloat(flags.threshold)
        if (isNaN(thresholdValue)) {
          this.error('Threshold must be a valid number', { exit: 1 })
        }
        logger(
          chalk.grey(
            `• Threshold: ${chalk.hex('#7b301f')(thresholdValue.toString())}`,
          ),
        )
      }
      logger('')

      // Perform search
      const results = await searchStories({
        queryText: args.query,
        topK: flags.limit,
        threshold: thresholdValue,
      })

      if (results.length === 0) {
        logger(
          chalk.hex('#c27a52')(`\n⚠️  No stories found matching the query.\n`),
        )
        return
      }

      // Display results
      logger(
        chalk.grey(
          `• Found ${chalk.hex('#7b301f')(results.length.toString())} ${results.length === 1 ? 'story' : 'stories'}:\n`,
        ),
      )

      const gitRoot = await findGitRoot()
      for (const story of results) {
        const absolutePath = resolve(gitRoot, story.filePath)
        const linkUrl = `vscode://file/${absolutePath}`

        // Build title with score inline
        let titleWithScore = story.title
        if (story.score !== undefined) {
          const scoreColor =
            story.score >= 0.8
              ? chalk.hex('#7ba179')
              : story.score >= 0.6
                ? chalk.hex('#d4a574')
                : chalk.grey
          const scoreText = scoreColor(`(${story.score.toFixed(3)})`)
          titleWithScore = `${story.title} ${scoreText}`
        }

        const styledTitle = chalk.bold.hex('#7ba179')(titleWithScore)
        const titleLink = terminalLink(styledTitle, linkUrl)
        logger(titleLink)

        if (story.behavior) {
          logger(chalk.grey(`  ${story.behavior}`))
        }

        logger(chalk.grey(`  ${story.filePath}`))
        logger('') // Empty line between stories
      }
    } catch (error) {
      if (error instanceof Error) {
        this.error(error.message, { exit: 1 })
      } else {
        this.error('Failed to search stories', { exit: 1 })
      }
    }
  }
}
