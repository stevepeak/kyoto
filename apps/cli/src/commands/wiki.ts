import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'
import ora from 'ora'
import { writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'

import { getModel } from '../helpers/get-model.js'
import { validateStoryStructure } from '../helpers/wiki-validation.js'
import {
  getFolderHierarchy,
  getStoriesInFolder,
  folderHasStories,
  type FolderInfo,
} from '../helpers/wiki-traversal.js'
import { generateDomainSummary } from '../helpers/wiki-summary-agent.js'
import { generateMermaidChart } from '../helpers/wiki-mermaid-agent.js'
import {
  generateFolderMarkdown,
  combineMarkdownFiles,
  type FolderMarkdown,
} from '../helpers/wiki-markdown-generator.js'
import { displayHeader } from '../helpers/display-header.js'
import { assertCliPrerequisites } from '../helpers/assert-cli-prerequisites.js'

const STORIES_DIR = '.kyoto'

export default class Wiki extends Command {
  static override description =
    'Generate wiki documentation from organized story files'

  static override examples = [
    '$ kyoto wiki',
    '$ kyoto wiki --model "gpt-4o-mini" --provider openai',
    '$ kyoto wiki --model "openai/gpt-4o-mini" --provider vercel',
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
    const { flags } = await this.parse(Wiki)

    // Create a logger that uses oclif's log method
    const logger = (message: string) => {
      this.log(message)
    }

    try {
      // Assert prerequisites: environment variables and git repository
      await assertCliPrerequisites()

      // Show stage header
      displayHeader(logger)

      // Validation Phase
      logger(chalk.grey('• Validating story structure...'))
      const validationSpinner = ora({
        text: chalk.white('Validating story structure...'),
        spinner: 'squareCorners',
        color: 'red',
      }).start()

      try {
        await validateStoryStructure()
        validationSpinner.succeed(chalk.white('Story structure validated'))
      } catch (error) {
        validationSpinner.fail(chalk.white('Story structure validation failed'))
        if (error instanceof Error) {
          logger(chalk.hex('#c27a52')(`\n⚠️  ${error.message}\n`))
        }
        this.exit(1)
        return
      }

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

      // Discovery Phase
      logger(chalk.grey('• Discovering folder hierarchy...'))
      const discoverySpinner = ora({
        text: chalk.white('Discovering folders...'),
        spinner: 'squareCorners',
        color: 'red',
      }).start()

      const folders = await getFolderHierarchy()

      // Filter to only folders that contain stories (not just subfolders)
      const foldersWithStories: FolderInfo[] = []
      for (const folder of folders) {
        const hasStories = await folderHasStories(folder.path)
        if (hasStories) {
          foldersWithStories.push(folder)
        }
      }

      discoverySpinner.succeed(
        chalk.white(
          `Found ${foldersWithStories.length} ${foldersWithStories.length === 1 ? 'folder' : 'folders'} with stories`,
        ),
      )

      if (foldersWithStories.length === 0) {
        logger(
          chalk.hex('#c27a52')(
            `\n⚠️  No folders with stories found to process.\n`,
          ),
        )
        return
      }

      // Processing Phase (bottom-up)
      logger(
        chalk.grey(
          `\n• Processing ${foldersWithStories.length} ${foldersWithStories.length === 1 ? 'folder' : 'folders'}...\n`,
        ),
      )

      const folderMarkdowns: FolderMarkdown[] = []
      let processedCount = 0
      let failedCount = 0

      for (const folder of foldersWithStories) {
        const folderSpinner = ora({
          text: chalk.white(folder.path),
          spinner: 'squareCorners',
          color: 'red',
        }).start()

        try {
          // Get stories in this folder
          folderSpinner.text =
            chalk.white(folder.path) + ' ' + chalk.grey('reading stories...')
          const stories = await getStoriesInFolder(folder.path)

          if (stories.length === 0) {
            folderSpinner.succeed(
              chalk.white(`${folder.path} - ${chalk.grey('no stories')}`),
            )
            continue
          }

          // Generate summary
          folderSpinner.text =
            chalk.white(folder.path) + ' ' + chalk.grey('generating summary...')
          const summary = await generateDomainSummary({
            model,
            stories,
            folderPath: folder.path,
            onProgress: (progress) => {
              folderSpinner.text =
                chalk.white(folder.path) + ' ' + chalk.grey(progress)
            },
          })

          // Generate mermaid chart
          folderSpinner.text =
            chalk.white(folder.path) + ' ' + chalk.grey('generating diagram...')
          const mermaidChart = await generateMermaidChart({
            model,
            stories,
            folderPath: folder.path,
            onProgress: (progress) => {
              folderSpinner.text =
                chalk.white(folder.path) + ' ' + chalk.grey(progress)
            },
          })

          // Generate markdown
          folderSpinner.text =
            chalk.white(folder.path) +
            ' ' +
            chalk.grey('generating markdown...')
          const markdown = generateFolderMarkdown({
            summary,
            mermaidChart,
            stories,
            folderPath: folder.path,
            depth: folder.depth,
          })

          // Write README.md to folder
          const folderFullPath = resolve(
            process.cwd(),
            STORIES_DIR,
            folder.path,
          )
          const readmePath = join(folderFullPath, 'README.md')
          await writeFile(readmePath, markdown, 'utf-8')

          // Store for final combination
          folderMarkdowns.push({
            folderPath: folder.path,
            markdown,
            depth: folder.depth,
          })

          folderSpinner.succeed(
            chalk.white(
              `${folder.path} - ${chalk.hex('#7ba179')(`${stories.length} ${stories.length === 1 ? 'story' : 'stories'}`)}`,
            ),
          )
          processedCount++
        } catch (error) {
          folderSpinner.fail(chalk.white(folder.path))
          logger(
            chalk.hex('#c27a52')(
              `\n⚠️  Failed to process folder: ${folder.path}\n`,
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
                  'Please check your OPENAI_API_KEY or AI_GATEWAY_API_KEY environment variable.\n',
                ),
              )
            } else {
              logger(chalk.hex('#7c6653')(`Error: ${error.message}\n`))
            }
          }
          failedCount++
        }
      }

      // Final Output Phase
      if (folderMarkdowns.length > 0) {
        logger(
          chalk.grey(`\n• Combining markdown files into root README.md...\n`),
        )

        const combineSpinner = ora({
          text: chalk.white('Combining markdown files...'),
          spinner: 'squareCorners',
          color: 'red',
        }).start()

        try {
          const combinedMarkdown = combineMarkdownFiles({
            folderMarkdowns,
            rootPath: STORIES_DIR,
          })

          const rootReadmePath = resolve(
            process.cwd(),
            STORIES_DIR,
            'README.md',
          )
          await writeFile(rootReadmePath, combinedMarkdown, 'utf-8')

          combineSpinner.succeed(chalk.white('Root README.md created'))

          // Summary
          logger(
            chalk.hex('#7ba179')(
              `\n✓ Generated wiki documentation:\n` +
                `  • ${processedCount} ${processedCount === 1 ? 'folder' : 'folders'} processed\n` +
                `  • Root README.md: ${chalk.hex('#7c6653')(rootReadmePath)}\n`,
            ),
          )

          if (failedCount > 0) {
            logger(
              chalk.hex('#c27a52')(
                `\n⚠️  Failed to process ${failedCount} ${failedCount === 1 ? 'folder' : 'folders'}\n`,
              ),
            )
          }
        } catch (error) {
          combineSpinner.fail(chalk.white('Failed to combine markdown files'))
          if (error instanceof Error) {
            logger(chalk.hex('#7c6653')(`Error: ${error.message}\n`))
          }
          throw error
        }
      } else {
        logger(
          chalk.hex('#c27a52')(
            `\n⚠️  No folders were successfully processed.\n`,
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
        this.error('Failed to generate wiki', { exit: 1 })
      }
    }
  }
}
