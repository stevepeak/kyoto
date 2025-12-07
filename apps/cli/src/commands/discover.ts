import { Command, Args, Flags } from '@oclif/core'
import chalk from 'chalk'
import { stat, mkdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import ora from 'ora'

import { getModel } from '../helpers/config/get-model.js'
import { agents } from '@app/agents'
import type { DiscoveredStory } from '@app/schemas'
import {
  validateFilePath,
  findTypeScriptFiles,
} from '../helpers/file/discovery.js'
import { displayHeader } from '../helpers/display/display-header.js'
import { assertCliPrerequisites } from '../helpers/config/assert-cli-prerequisites.js'
import { getCurrentBranch, getCurrentCommitSha } from '@app/shell'
import { updateDetailsJson } from '../helpers/config/update-details-json.js'
import { processDiscoveredCandidates } from '../helpers/stories/process-candidates.js'

export default class Discover extends Command {
  static override description = 'Generate behavior stories from a code file'

  static override examples = [
    '$ kyoto discover',
    '$ kyoto discover --limit 5',
    '$ kyoto discover apps/web --model "gpt-4o-mini" --provider openai',
    '$ kyoto discover packages/db/src --model "openai/gpt-4o-mini" --provider vercel',
  ]

  static override args = {
    folder: Args.string({
      description:
        'Optional file or folder path to search (relative to git root). Defaults to git root if not provided.',
      required: false,
    }),
  }

  static override flags = {
    model: Flags.string({
      description:
        'Model to use (e.g., "gpt-4o-mini" for OpenAI or "openai/gpt-4o-mini" for Vercel)',
      char: 'm',
    }),
    provider: Flags.string({
      description: 'Provider to use: openai, vercel, or auto (default: auto)',
      char: 'p',
      options: ['openai', 'vercel', 'auto'],
      default: 'auto',
    }),
    limit: Flags.integer({
      description: 'Maximum number of stories to discover before stopping',
      char: 'l',
    }),
  }

  override async run(): Promise<void> {
    const { args, flags } = await this.parse(Discover)

    // Create a logger that uses oclif's log method (passes through colored messages)
    const logger = (message: string) => {
      this.log(message)
    }

    try {
      // Assert prerequisites: AI configuration and git repository
      const { gitRoot } = await assertCliPrerequisites()

      // Ensure .kyoto directory exists
      const kyotoDir = join(gitRoot, '.kyoto')
      await mkdir(kyotoDir, { recursive: true })

      // Default to git root if no folder provided, otherwise use provided folder
      const inputPath = args.folder || '.'

      // Validate path exists
      await validateFilePath(inputPath)

      // Determine if it's a file or directory
      const resolvedPath = resolve(gitRoot, inputPath)
      const stats = await stat(resolvedPath)
      const isDirectory = stats.isDirectory()

      // Get list of files to process
      const filesToProcess = isDirectory
        ? await findTypeScriptFiles(inputPath)
        : [inputPath]

      if (filesToProcess.length === 0) {
        logger(
          chalk.hex('#c27a52')(
            `\n⚠️  No TypeScript files found in ${inputPath}\n`,
          ),
        )
        return
      }

      // Show stage header with red kanji
      displayHeader({ logger })
      logger(
        chalk.grey(
          `• Exploring stories within ${chalk.hex('#7b301f')(filesToProcess.length)} ${filesToProcess.length === 1 ? chalk.hex('#7b301f')('file') : chalk.hex('#7b301f')('files')}`,
        ),
      )

      // Process each file with its own agent
      let totalProcessedStories = 0
      const storyLimit = flags.limit

      // Get model configuration
      const { model, modelId, provider } = await getModel({
        model: flags.model,
        provider: flags.provider as 'openai' | 'vercel' | 'auto' | undefined,
        logger,
      })
      logger(
        chalk.grey(
          `• Using ${chalk.hex('#7b301f')(modelId)} on ${chalk.hex('#7b301f')(provider)}`,
        ),
      )

      if (storyLimit) {
        logger(
          chalk.grey(
            `• Limit ${chalk.hex('#7b301f')(storyLimit.toString())} behaviors`,
          ),
        )
      }

      for (const filePath of filesToProcess) {
        // Check if we've reached the limit
        if (storyLimit && totalProcessedStories >= storyLimit) {
          logger(
            chalk.grey(
              `\n• Reached story limit of ${chalk.hex('#7b301f')(storyLimit.toString())}. Stopping discovery.\n`,
            ),
          )
          break
        }
        logger('')
        logger(chalk.white(`Evaluating ${filePath}`))

        try {
          // Calculate how many stories we can still discover
          const remainingLimit = storyLimit
            ? storyLimit - totalProcessedStories
            : undefined

          // Step 1: Discover candidate behaviors
          const discoverySpinner = ora({
            text:
              chalk.hex('#7b301f')(`Discovery Agent: `) +
              chalk.grey('Starting...'),
            spinner: 'squareCorners',
            color: 'red',
            indent: 2,
          }).start()

          const discoveryResult = await agents.discovery.run({
            filePath,
            options: {
              model,
              maxStories: remainingLimit,
              logger: (msg: string) => {
                discoverySpinner.text =
                  chalk.hex('#7b301f')(`Discovery Agent: `) + chalk.grey(msg)
              },
            },
          })

          const candidates = (discoveryResult as { stories: DiscoveredStory[] })
            .stories

          if (candidates.length === 0) {
            discoverySpinner.succeed(
              chalk.hex('#7b301f')(`Discovery Agent: `) +
                chalk.grey('No candidate behaviors found'),
            )
            continue
          }

          discoverySpinner.succeed(
            chalk.hex('#7b301f')(`Discovery Agent: `) +
              chalk.grey(
                `Found ${candidates.length} candidate behavior${candidates.length === 1 ? '' : 's'}`,
              ),
          )

          logger('')

          // Step 2-6: Process candidates (check, enrich, embed, write, save)
          const processedStories = await processDiscoveredCandidates({
            candidates,
            model,
            logger,
          })

          totalProcessedStories += processedStories.length
        } catch (error) {
          logger(chalk.red(`✖ ${filePath}`))
          logger(chalk.hex('#c27a52')(`\n⚠️  Failed to generate stories\n`))
          // Continue processing other files even if one fails
          if (error instanceof Error) {
            // Check if it's an API key related error
            if (
              error.message.includes('API key') ||
              error.message.includes('authentication') ||
              error.message.includes('unauthorized')
            ) {
              logger(
                chalk.hex('#c27a52')(
                  'The API key appears to be invalid or expired.\n',
                ),
              )
              logger(
                chalk.hex('#7c6653')(
                  'Please check your API key configuration. Run `kyoto init` to reconfigure.\n',
                ),
              )
            } else if (
              error.message.includes('Vercel AI Gateway') ||
              error.message.includes('Gateway request failed') ||
              error.message.includes('Invalid error response format')
            ) {
              logger(chalk.hex('#c27a52')('AI Gateway error detected.\n'))
              logger(
                chalk.hex('#7c6653')(
                  'The AI Gateway request failed. This could be due to:\n',
                ),
              )
              logger(chalk.hex('#7c6653')('  - Invalid or expired API key\n'))
              logger(chalk.hex('#7c6653')('  - Network connectivity issues\n'))
              logger(
                chalk.hex('#7c6653')(
                  '  - Gateway service temporarily unavailable\n',
                ),
              )
              logger(
                chalk.hex('#7c6653')(
                  '\nRun `kyoto init` to reconfigure your API key, or try using --provider openai instead.\n',
                ),
              )
            } else {
              logger(chalk.hex('#7c6653')(`Error: ${error.message}\n`))
            }
          } else {
            logger(chalk.hex('#7c6653')('An unknown error occurred.\n'))
          }
        }
      }

      // Record current branch and commit SHA to details.json
      const detailsPath = join(kyotoDir, 'details.json')
      const branch = await getCurrentBranch(gitRoot)
      const sha = await getCurrentCommitSha(gitRoot)
      await updateDetailsJson(detailsPath, branch, sha)

      if (totalProcessedStories === 0) {
        logger(chalk.hex('#c27a52')('\nNo stories generated\n'))
        return
      }

      logger(
        chalk.hex('#7ba179')(
          `\n√ Processed ${totalProcessedStories} ${totalProcessedStories === 1 ? 'story' : 'stories'} from ${filesToProcess.length} ${filesToProcess.length === 1 ? 'file' : 'files'}:\n`,
        ),
      )
    } catch (error) {
      if (error instanceof Error) {
        // Check if it's a file validation error
        if (
          error.message.includes('not found') ||
          error.message.includes('Path is not a file') ||
          error.message.includes('Path is not a directory')
        ) {
          logger(chalk.hex('#c27a52')(`\n⚠️  ${error.message}\n`))
          this.exit(1)
          return
        }
        // For other errors, use the default error handler
        this.error(error.message, { exit: 1 })
      } else {
        this.error('Failed to generate stories', { exit: 1 })
      }
    }
  }
}
