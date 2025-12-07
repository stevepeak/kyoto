import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'
import ora from 'ora'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { getModel } from '../helpers/get-model.js'
import { readAllStoryFiles } from '../helpers/story-file-reader.js'
import { generateHierarchy } from '../helpers/hierarchy-agent.js'
import type { HierarchyOutput } from '../helpers/hierarchy-agent.js'
import { determineFilePlacement } from '../helpers/file-placement-agent.js'
import { createStoryDirectory } from '../helpers/file-organizer.js'
import { displayHeader } from '../helpers/display-header.js'
import { displayStoryTree } from '../helpers/display-story-tree.js'
import { pwdKyoto } from '../helpers/find-kyoto-dir.js'
import { assertCliPrerequisites } from '../helpers/assert-cli-prerequisites.js'

function formatStoryFilename(filename: string): string {
  return filename
    .replace(/\.json$/, '') // remove extension
    .replace(/-/g, ' ') // replace dashes with spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()) // capitalize first letter of each word
}

/**
 * Recursively finds all directories within a given path.
 */
async function findDirectories(
  dirPath: string,
  basePath: string = '',
): Promise<Array<{ path: string; fullPath: string }>> {
  const directories: Array<{ path: string; fullPath: string }> = []
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const relativePath = basePath ? join(basePath, entry.name) : entry.name
        const fullPath = join(dirPath, entry.name)
        directories.push({ path: relativePath, fullPath })
        // Recursively find nested directories
        const nested = await findDirectories(fullPath, relativePath)
        directories.push(...nested)
      }
    }
  } catch {
    // Ignore errors (e.g., permission denied)
  }
  return directories
}

/**
 * Checks if there are any subdirectories in the .kyoto/stories directory.
 */
async function hasExistingDirectories(): Promise<boolean> {
  const { stories: storiesDir } = await pwdKyoto()
  try {
    const entries = await readdir(storiesDir, { withFileTypes: true })
    return entries.some((entry) => entry.isDirectory())
  } catch {
    return false
  }
}

/**
 * Builds a hierarchy from existing directories in .kyoto/stories.
 */
async function buildHierarchyFromExistingDirectories(): Promise<HierarchyOutput> {
  const { stories: storiesDir } = await pwdKyoto()
  const directories = await findDirectories(storiesDir)

  const hierarchy: HierarchyOutput = {
    hierarchy: directories.map((dir) => ({
      path: dir.path,
      description: `Existing directory: ${dir.path}`,
    })),
    reasoning: '',
  }

  return hierarchy
}

export default class Organize extends Command {
  static override description =
    'Organize story files into a logical directory hierarchy'

  static override examples = [
    '$ kyoto organize',
    '$ kyoto organize --model "gpt-4o-mini" --provider openai',
    '$ kyoto organize --model "openai/gpt-4o-mini" --provider vercel',
  ]

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
    const { flags } = await this.parse(Organize)

    // Create a logger that uses oclif's log method (passes through colored messages)
    const logger = (message: string) => {
      this.log(message)
    }

    try {
      // Assert prerequisites: AI configuration and git repository
      await assertCliPrerequisites()

      // Show stage header with red kanji
      displayHeader({ logger })

      const storyFiles = await readAllStoryFiles()

      if (storyFiles.length === 0) {
        logger(
          chalk.hex('#7ba179')(
            `\n✓ Organization is already complete. Nothing more to organize.\n`,
          ),
        )
        // Display the tree structure
        await displayStoryTree(logger)
        return
      }

      logger(
        chalk.grey(
          `• Found ${chalk.hex('#7b301f')(storyFiles.length.toString())} ${storyFiles.length === 1 ? 'story file' : 'story files'}`,
        ),
      )

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

      // Check if directories already exist
      const hasDirectories = await hasExistingDirectories()
      let hierarchy: HierarchyOutput

      if (hasDirectories) {
        // Skip hierarchy generation and use existing directories
        hierarchy = await buildHierarchyFromExistingDirectories()
        logger(
          chalk.grey(
            `• Using existing directory structure: ${chalk.hex('#7b301f')(hierarchy.hierarchy.length.toString())} ${hierarchy.hierarchy.length === 1 ? 'directory' : 'directories'}`,
          ),
        )
      } else {
        // Generate new hierarchy
        const hierarchySpinner = ora({
          text: chalk.white('Analyzing story structure...'),
          spinner: 'squareCorners',
          color: 'red',
        }).start()

        try {
          hierarchy = await generateHierarchy({
            model,
            storyFiles,
            onProgress: (progress) => {
              hierarchySpinner.text =
                chalk.white('Analyzing... ') + chalk.grey(progress)
            },
          })

          hierarchySpinner.succeed(
            chalk.white(
              `Hierarchy created: ${chalk.hex('#7ba179')(hierarchy.hierarchy.length.toString())} ${hierarchy.hierarchy.length === 1 ? 'directory' : 'directories'}`,
            ),
          )
        } catch (error) {
          hierarchySpinner.fail(chalk.white('Failed to generate hierarchy'))
          logger(chalk.hex('#c27a52')(`\n⚠️  Failed to generate hierarchy\n`))
          if (error instanceof Error) {
            logger(chalk.hex('#7c6653')(`Error: ${error.message}\n`))
          }
          throw error
        }
      }

      // Log hierarchy reasoning
      logger(chalk.grey(`>>> ${hierarchy.reasoning}\n`))

      const dirSpinner = ora({
        text: chalk.white(`Creating directories...`),
        spinner: 'squareCorners',
        color: 'red',
      }).start()
      for (const dir of hierarchy.hierarchy) {
        await createStoryDirectory(dir.path)
      }
      dirSpinner.succeed(
        chalk.white(`Created ${hierarchy.hierarchy.length} directories`),
      )

      // Step 3: Move files one by one
      logger(
        chalk.grey(
          `\n• Organizing ${storyFiles.length} ${storyFiles.length === 1 ? 'file' : 'files'}...\n`,
        ),
      )

      let movedCount = 0
      let failedCount = 0

      for (const storyFile of storyFiles) {
        const formattedFilename = formatStoryFilename(storyFile.filename)
        const fileSpinner = ora({
          text: chalk.white(formattedFilename),
          spinner: 'squareCorners',
          color: 'red',
        }).start()

        try {
          fileSpinner.text =
            chalk.white(formattedFilename) +
            ' ' +
            chalk.grey('determining location...')

          await determineFilePlacement({
            model,
            storyFile,
            hierarchy,
            onProgress: (progress) => {
              fileSpinner.text =
                chalk.white(formattedFilename) + ' ' + chalk.grey(progress)
            },
            ora: fileSpinner,
          })

          // The agent should have already moved the file via the tool
          fileSpinner.succeed(
            chalk.white(`${formattedFilename} - ${chalk.grey('moved')}`),
          )
          movedCount++
        } catch (error) {
          fileSpinner.fail(chalk.white(formattedFilename))
          logger(
            chalk.hex('#c27a52')(
              `\n⚠️  Failed to organize file: ${formattedFilename}\n`,
            ),
          )
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
              logger(
                chalk.hex('#7c6653')(
                  '  - Invalid or expired API key\n',
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
                  '\nRun `kyoto init` to reconfigure your API key, or try using --provider openai instead.\n',
                ),
              )
            } else {
              logger(chalk.hex('#7c6653')(`Error: ${error.message}\n`))
            }
          } else {
            logger(chalk.hex('#7c6653')('An unknown error occurred.\n'))
          }
          failedCount++
        }
      }

      // Summary
      if (movedCount > 0) {
        logger(
          chalk.hex('#7ba179')(
            `\n✓ Organized ${movedCount} ${movedCount === 1 ? 'file' : 'files'} into ${hierarchy.hierarchy.length} ${hierarchy.hierarchy.length === 1 ? 'directory' : 'directories'}\n`,
          ),
        )
      }

      if (failedCount > 0) {
        logger(
          chalk.hex('#c27a52')(
            `\n⚠️  Failed to organize ${failedCount} ${failedCount === 1 ? 'file' : 'files'}\n`,
          ),
        )
      }

      // Display tree structure
      await displayStoryTree(logger)
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
        this.error('Failed to organize stories', { exit: 1 })
      }
    }
  }
}
