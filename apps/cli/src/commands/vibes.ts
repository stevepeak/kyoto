import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'
import { execa } from 'execa'
import ora from 'ora'
import { agents } from '@app/agents'
import { assertCliPrerequisites } from '../helpers/assert-cli-prerequisites.js'
import { displayHeader } from '../helpers/display-header.js'

interface CommitInfo {
  hash: string // Full hash
  shortHash: string // Short hash (6 chars)
  message: string
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
    const result = await agents.commitEvaluator.run({
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

      // Display header banner
      displayHeader({ logger, message: 'Vibe in Kyoto' })

      // Get the initial commit to establish baseline
      let lastCommitHash: string | null = null
      const initialCommit = await getLatestCommit(gitRoot)

      if (initialCommit) {
        lastCommitHash = initialCommit.shortHash
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

      // Poll for new commits
      let pollInterval: NodeJS.Timeout | null = null
      let shouldExit = false

      // Handle graceful shutdown
      const cleanup = () => {
        if (pollInterval) {
          clearInterval(pollInterval)
          pollInterval = null
        }
        shouldExit = true
        this.log('\n' + chalk.grey('Goodbye! 👋'))
        process.exit(0)
      }

      process.on('SIGINT', cleanup)
      process.on('SIGTERM', cleanup)

      pollInterval = setInterval(async () => {
        if (shouldExit) {
          return
        }

        const latestCommit = await getLatestCommit(gitRoot)

        if (!latestCommit) {
          return
        }

        // Check if this is a new commit
        if (latestCommit.shortHash !== lastCommitHash) {
          // Truncate message if needed
          const truncatedMessage =
            latestCommit.message.length > maxLength
              ? latestCommit.message.substring(0, maxLength - 3) + '...'
              : latestCommit.message

          // Show spinner with commit info
          const spinner = ora({
            text:
              chalk.hex('#7b301f')(latestCommit.shortHash) +
              ' ' +
              chalk.white(truncatedMessage),
            spinner: 'squareCorners',
            color: 'red',
          }).start()

          try {
            // Process the commit using the agent
            const explanation = await this.processCommit(latestCommit)

            // Stop the spinner
            spinner.stop()

            // Display the explanation
            this.log('')
            this.log(chalk.grey(explanation))
            this.log('')
          } catch (error) {
            spinner.stop()
            this.log('')
            this.log(
              chalk.hex('#c27a52')(
                `⚠️  Failed to evaluate commit: ${error instanceof Error ? error.message : 'Unknown error'}`,
              ),
            )
            this.log('')
          }

          lastCommitHash = latestCommit.shortHash
        }
      }, interval)

      // Keep the process alive by waiting indefinitely
      await new Promise<void>(() => {
        // This promise never resolves, keeping the process alive
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
