import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'
import ora from 'ora'
import { mkdir } from 'node:fs/promises'
import { agents } from '@app/agents'
import {
  getChangedTsFiles,
  getLatestCommit,
  getCurrentBranch,
  type CommitInfo,
} from '@app/shell'
import { assertCliPrerequisites } from '../helpers/config/assert-cli-prerequisites.js'
import { displayHeader } from '../helpers/display/display-header.js'
import { findGitRoot } from '@app/shell'
import { pwdKyoto } from '../helpers/config/find-kyoto-dir.js'
import { readAllStoryFilesRecursively } from '../helpers/file/reader.js'
import { updateDetailsJson } from '../helpers/config/update-details-json.js'
import type { DiffEvaluatorOutput } from '@app/schemas'

export default class Vibes extends Command {
  static override description =
    'Monitor the working project commits and log new commits'

  static override examples = ['$ kyoto vibes', '$ kyoto vibes --max-length 50']

  static override flags = {
    'max-length': Flags.integer({
      description: 'Maximum characters for commit message',
      char: 'm',
      default: 60,
    }),
    interval: Flags.integer({
      description: 'Polling interval in milliseconds',
      char: 'i',
      default: 1000,
    }),
  }

  /**
   * Deterministic pre-check: checks if any TS files changed and matches them against story codeReferences
   */
  private async deterministicCheck(
    commitSha: string,
    gitRoot: string,
  ): Promise<DiffEvaluatorOutput | null> {
    // Get changed TS files
    const changedTsFiles = await getChangedTsFiles(commitSha, gitRoot)

    // If no TS files changed, return early
    if (changedTsFiles.length === 0) {
      return {
        text: 'No relevant files changed',
        stories: [],
      }
    }

    // Read all story files
    let storyFiles
    try {
      storyFiles = await readAllStoryFilesRecursively()
    } catch {
      // If stories directory doesn't exist, skip deterministic check
      return null
    }

    // Match changed files against story codeReferences
    const matchedStories: DiffEvaluatorOutput['stories'] = []
    const matchedStoryPaths = new Set<string>()

    for (const storyFile of storyFiles) {
      // Skip if already matched
      if (matchedStoryPaths.has(storyFile.path)) {
        continue
      }

      for (const codeRef of storyFile.story.codeReferences) {
        // Simple file path matching - check if any changed file matches the codeReference file
        const refFile = codeRef.file
        const matches = changedTsFiles.some((changedFile) => {
          // Check if paths match (handle relative paths)
          return (
            changedFile === refFile ||
            changedFile.endsWith(refFile) ||
            refFile.endsWith(changedFile)
          )
        })

        if (matches) {
          matchedStories.push({
            filePath: storyFile.path,
            scopeOverlap: 'significant', // Default to significant for deterministic matches
            reasoning: `Changed file ${refFile} matches story code reference`,
          })
          matchedStoryPaths.add(storyFile.path)
          // Only add each story once
          break
        }
      }
    }

    // Return matched stories (will be merged with AI results)
    if (matchedStories.length > 0) {
      return {
        text: '',
        stories: matchedStories,
      }
    }

    // No matches found deterministically, let AI do the analysis
    return null
  }

  /**
   * Process a new commit using the commit evaluator agent
   */
  private async processCommit(
    commit: CommitInfo,
  ): Promise<DiffEvaluatorOutput> {
    const gitRoot = await findGitRoot()

    // Run deterministic check first
    const deterministicResult = await this.deterministicCheck(
      commit.hash,
      gitRoot,
    )

    // If deterministic check found no TS files, return early
    if (deterministicResult?.text === 'No relevant files changed') {
      return deterministicResult
    }

    // Otherwise, run AI agent
    const aiResult = await agents.diffEvaluator.run({
      commitSha: commit.hash,
      options: {
        maxSteps: agents.diffEvaluator.options.maxSteps,
        onProgress: (_message: string) => {
          // Progress updates can be handled here if needed
        },
      },
    })

    // Merge deterministic and AI results if we have deterministic matches
    if (deterministicResult && deterministicResult.stories.length > 0) {
      return {
        text: aiResult.text,
        stories: [...deterministicResult.stories, ...aiResult.stories],
      }
    }

    return aiResult
  }

  /**
   * Handles processing a new commit (shows spinner, processes, displays result)
   */
  private async handleNewCommit(
    commit: CommitInfo,
    maxLength: number,
    detailsPath: string,
  ): Promise<void> {
    // Truncate message if needed
    const truncatedMessage =
      commit.message.length > maxLength
        ? commit.message.substring(0, maxLength - 3) + '...'
        : commit.message

    // Show spinner with commit info
    const spinner = ora({
      text:
        chalk.hex('#7b301f')(commit.shortHash) +
        ' ' +
        chalk.white(truncatedMessage),
      spinner: 'squareCorners',
      color: 'red',
    }).start()

    try {
      // Process the commit using the agent
      const result = await this.processCommit(commit)
      // * NOTE ^^ cannot print to screen otherwise it busts the spinner

      // Stop the spinner
      spinner.succeed()

      // Display impacted stories
      if (result.stories.length > 0) {
        this.log('')
        this.log(
          chalk.hex('#7ba179')(
            `  ${result.stories.length} ${result.stories.length === 1 ? 'story' : 'stories'} impacted:`,
          ),
        )
        this.log('')

        for (const story of result.stories) {
          const overlapColor =
            story.scopeOverlap === 'significant'
              ? chalk.hex('#c27a52')
              : story.scopeOverlap === 'moderate'
                ? chalk.hex('#d4a574')
                : chalk.grey

          this.log(`  ${overlapColor(story.scopeOverlap.toUpperCase())}`)
          this.log(`    ${chalk.white(story.filePath)}`)
          this.log(`    ${chalk.grey(story.reasoning)}`)
          this.log('')
        }
      } else {
        this.log(chalk.grey('  No stories impacted'))
      }

      // Update details.json with the new commit
      const gitRoot = await findGitRoot()
      const branch = await getCurrentBranch(gitRoot)
      await updateDetailsJson(detailsPath, branch, commit.hash)
    } catch (error) {
      spinner.fail(
        `⚠️  Failed to evaluate commit: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
      throw error // Re-throw so caller knows processing failed
    }
  }

  override async run(): Promise<void> {
    const { flags } = await this.parse(Vibes)
    const maxLength = flags['max-length'] ?? 60
    const interval = flags.interval ?? 1000

    const logger = (message: string) => {
      this.log(message)
    }

    try {
      // Assert prerequisites (AI needed for commit evaluation)
      const { gitRoot, github } = await assertCliPrerequisites({
        requireAi: true,
      })

      // Get Kyoto paths
      const { root: kyotoRoot, details: detailsPath } = await pwdKyoto()
      await mkdir(kyotoRoot, { recursive: true })

      // Display header banner
      displayHeader({ logger, message: 'Vibe in Kyoto' })

      // Get the initial commit to establish baseline
      let lastCommitHash: string | null = null
      const commit = await getLatestCommit(gitRoot)

      if (commit) {
        lastCommitHash = commit.shortHash
        const repoSlug = github
          ? `${github.owner}/${github.repo}`
          : (gitRoot.split('/').pop() ?? 'repository')
        this.log(
          chalk.grey(
            `Monitoring commits to ${chalk.hex('#7b301f')(repoSlug)}...`,
          ),
        )
        this.log('')
      } else {
        this.error('No commits found in repository', { exit: 1 })
        return
      }

      // Commit watcher and processor state
      let pollInterval: NodeJS.Timeout | null = null
      let shouldExit = false
      let isProcessing = false
      let resolveExit: (() => void) | null = null

      // Handle graceful shutdown
      const cleanup = () => {
        shouldExit = true
        if (pollInterval) {
          clearInterval(pollInterval)
          pollInterval = null
        }
        this.log('\n' + chalk.grey('Goodbye! 👋'))
        // Resolve the exit promise to allow the process to exit
        if (resolveExit) {
          resolveExit()
        } else {
          process.exit(0)
        }
      }

      process.on('SIGINT', cleanup)
      process.on('SIGTERM', cleanup)

      // Watcher: Lightweight polling that only detects new commits
      pollInterval = setInterval(async () => {
        if (shouldExit || isProcessing) {
          return // Skip if exiting or already processing
        }

        const latestCommit = await getLatestCommit(gitRoot)

        if (!latestCommit) {
          return
        }

        // Check if this is a new commit
        if (latestCommit.shortHash !== lastCommitHash) {
          // Mark as processing to prevent concurrent processing
          isProcessing = true

          // TODO
          // * need a queue
          // * ability to stop/quit
          // * batch many commits at once in a group
          // Process the commit asynchronously (don't await in the interval)
          this.handleNewCommit(latestCommit, maxLength, detailsPath)
            .then(() => {
              // Only update lastCommitHash after successful processing
              if (!shouldExit) {
                lastCommitHash = latestCommit.shortHash
              }
              isProcessing = false
            })
            .catch(() => {
              // On error, still mark as not processing so we can try again
              // Don't update lastCommitHash so we'll retry on next interval
              isProcessing = false
            })
        }
      }, interval)

      // Keep the process alive until cleanup is called
      await new Promise<void>((resolve) => {
        resolveExit = resolve
      })
    } catch (error) {
      if (error instanceof Error) {
        this.error(error.message, { exit: 1 })
      } else {
        this.error('Failed to monitor commits', { exit: 1 })
      }
    }
  }
}
