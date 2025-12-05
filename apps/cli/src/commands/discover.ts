import { Command, Args, Flags } from '@oclif/core'
import chalk from 'chalk'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import ora from 'ora'

import { getModel } from '../helpers/get-model.js'
import {
  generateStories,
  type Story,
} from '../helpers/story-generator-agent.js'
import {
  validateFilePath,
  findTypeScriptFiles,
} from '../helpers/file-discovery.js'
import { writeStoriesToFiles } from '../helpers/write-stories.js'
import { displayHeader } from '../helpers/display-header.js'

export default class Discover extends Command {
  static override description = 'Generate behavior stories from a code file'

  static override examples = [
    '$ kyoto discover .',
    '$ kyoto discover . --model "gpt-4o-mini" --provider openai',
    '$ kyoto discover . --model "openai/gpt-4o-mini" --provider vercel',
  ]

  static override args = {
    filePath: Args.string({
      description:
        'Path to the file to analyze (relative to current directory)',
      required: true,
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
  }

  override async run(): Promise<void> {
    const { args, flags } = await this.parse(Discover)
    const inputPath = args.filePath

    // Create a logger that uses oclif's log method (passes through colored messages)
    const logger = (message: string) => {
      this.log(message)
    }

    try {
      // Validate path exists
      await validateFilePath(inputPath)

      // Determine if it's a file or directory
      const resolvedPath = resolve(process.cwd(), inputPath)
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
      displayHeader(logger)
      logger(
        chalk.grey(
          `• Discovering user behaviors for ${chalk.hex('#7b301f')(filesToProcess.length)} ${filesToProcess.length === 1 ? chalk.hex('#7b301f')('file') : chalk.hex('#7b301f')('files')}`,
        ),
      )

      // Process each file with its own agent
      const allStories: Story[] = []
      const allWrittenFiles: string[] = []

      // Get model configuration
      const { model, modelId, provider } = getModel({
        model: flags.model,
        provider: flags.provider as 'openai' | 'vercel' | 'auto' | undefined,
        logger,
      })
      logger(
        chalk.grey(
          `• Using ${chalk.hex('#7b301f')(modelId)} on ${chalk.hex('#7b301f')(provider)}\n`,
        ),
      )

      for (const filePath of filesToProcess) {
        // Create a new spinner for each file (white filepath, beige spinner)
        const spinner = ora({
          text: chalk.white(filePath),
          spinner: 'squareCorners',
          color: 'red',
        }).start()

        try {
          // Update spinner to show current file
          spinner.text = chalk.white(filePath)

          // Generate stories for this file
          const { stories } = await generateStories({
            model,
            filePath,
            onProgress: (progress) => {
              spinner.text = chalk.white(filePath) + ' ' + chalk.grey(progress)
            },
          })

          if (stories.length > 0) {
            spinner.text =
              chalk.white(filePath) +
              ' ' +
              chalk.grey(`writing ${stories.length} stories...`)

            // Write stories to files
            const writtenFiles = await writeStoriesToFiles(stories)
            allStories.push(...stories)
            allWrittenFiles.push(...writtenFiles)
          }

          // Update spinner to show completion
          spinner.succeed(
            chalk.white(
              `${filePath} - ` +
                chalk.hex('#7ba179')(
                  `${stories.length} ${stories.length === 1 ? 'behavior' : 'behaviors'} discovered`,
                ),
            ),
          )
        } catch (error) {
          spinner.fail(chalk.white(filePath))
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
                  'Please check your OPENAI_API_KEY or AI_GATEWAY_API_KEY environment variable.\n',
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
              logger(
                chalk.hex('#7c6653')(
                  '  - Invalid or expired AI_GATEWAY_API_KEY\n',
                ),
              )
              logger(chalk.hex('#7c6653')('  - Network connectivity issues\n'))
              logger(
                chalk.hex('#7c6653')(
                  '  - Gateway service temporarily unavailable\n',
                ),
              )
              logger(
                chalk.hex('#7c6653')(
                  '\nTry using --provider openai with OPENAI_API_KEY instead.\n',
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

      if (allStories.length === 0) {
        logger(chalk.hex('#c27a52')('\nNo stories generated\n'))
        return
      }

      logger(
        chalk.hex('#7ba179')(
          `\√ Found ${allStories.length} stories from ${filesToProcess.length} ${filesToProcess.length === 1 ? 'file' : 'files'}:\n`,
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

