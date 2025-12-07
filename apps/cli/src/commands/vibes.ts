import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'
import { execa } from 'execa'
import ora from 'ora'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { agents } from '@app/agents'
import { assertCliPrerequisites } from '../helpers/assert-cli-prerequisites.js'
import { displayHeader } from '../helpers/display-header.js'
import { pwdKyoto, findGitRoot } from '../helpers/find-kyoto-dir.js'

interface CommitInfo {
  hash: string // Full hash
  shortHash: string // Short hash (6 chars)
  message: string
}

interface DetailsJson {
  latest?: {
    sha: string
    branch: string
  }
}

/**
 * Gets the latest commit information from the git repository
 */
async function getLatestCommit(gitRoot: string): Promise<CommitInfo | null> {
  try {
    const { stdout } = await execa('git', ['log', '-1', '--format=%H|%s'], {
      cwd: gitRoot,
    })

    if (!stdout.trim()) {
      return null
    }

    const [hash, ...messageParts] = stdout.trim().split('|')
    const message = messageParts.join('|') // Rejoin in case message contains |

    return {
      hash: hash, // Full hash
      shortHash: hash.substring(0, 6), // Short hash (6 chars)
      message: message.trim(),
    }
  } catch {
    return null
  }
}

/**
 * Gets the current branch name from git
 */
async function getCurrentBranch(gitRoot: string): Promise<string | null> {
  try {
    const { stdout } = await execa(
      'git',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      {
        cwd: gitRoot,
      },
    )
    return stdout.trim() || null
  } catch {
    return null
  }
}

/**
 * Updates the .kyoto/details.json file with the latest branch and commit SHA
 */
async function updateDetailsJson(
  detailsPath: string,
  branch: string | null,
  sha: string,
): Promise<void> {
  let details: DetailsJson = {}

  // Read existing details.json if it exists
  try {
    const content = await readFile(detailsPath, 'utf-8')
    details = JSON.parse(content) as DetailsJson
  } catch {
    // File doesn't exist or is invalid, start with empty object
    details = {}
  }

  // Update the latest field
  if (branch && sha) {
    details.latest = {
      sha,
      branch,
    }

    // Ensure .kyoto directory exists (extract from details path)
    const kyotoDir = detailsPath.replace('/details.json', '')
    await mkdir(kyotoDir, { recursive: true })

    // Write the updated details back
    await writeFile(
      detailsPath,
      JSON.stringify(details, null, 2) + '\n',
      'utf-8',
    )
  }
}

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
   * Process a new commit using the commit evaluator agent
   */
  private async processCommit(commit: CommitInfo): Promise<string> {
    const result: string = await agents.commitEvaluator.run({
      commitSha: commit.hash,
      options: {
        maxSteps: agents.commitEvaluator.options.maxSteps,
        onProgress: (_message: string) => {
          // Progress updates can be handled here if needed
        },
      },
    })

    return result
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
      await this.processCommit(commit)

      // Stop the spinner
      spinner.succeed()

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
