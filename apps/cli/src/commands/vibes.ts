import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'
import { execa } from 'execa'
import { findGitRoot } from '../helpers/find-kyoto-dir.js'

interface CommitInfo {
  hash: string
  message: string
}

/**
 * Gets the latest commit information from the git repository
 */
async function getLatestCommit(gitRoot: string): Promise<CommitInfo | null> {
  try {
    const { stdout } = await execa(
      'git',
      ['log', '-1', '--format=%H|%s'],
      {
        cwd: gitRoot,
      },
    )

    if (!stdout.trim()) {
      return null
    }

    const [hash, ...messageParts] = stdout.trim().split('|')
    const message = messageParts.join('|') // Rejoin in case message contains |

    return {
      hash: hash.substring(0, 6), // Short hash (6 chars)
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

  override async run(): Promise<void> {
    const { flags } = await this.parse(Vibes)
    const maxLength = flags['max-length'] ?? 60
    const interval = flags.interval ?? 1000

    try {
      const gitRoot = await findGitRoot()

      // Get the initial commit to establish baseline
      let lastCommitHash: string | null = null
      const initialCommit = await getLatestCommit(gitRoot)

      if (initialCommit) {
        lastCommitHash = initialCommit.hash
        this.log(
          chalk.grey(
            `Monitoring commits in ${chalk.hex('#7b301f')(gitRoot)}...`,
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
        this.log('\n')
        this.exit(0)
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
        if (latestCommit.hash !== lastCommitHash) {
          // Truncate message if needed
          const truncatedMessage =
            latestCommit.message.length > maxLength
              ? latestCommit.message.substring(0, maxLength - 3) + '...'
              : latestCommit.message

          // Format: 決   |    • 72c246 updated readme
          this.log(
            chalk.hex('#7b301f')('決') +
              '   |    ' +
              chalk.grey('•') +
              ' ' +
              chalk.hex('#7b301f')(latestCommit.hash) +
              ' ' +
              chalk.white(truncatedMessage),
          )

          lastCommitHash = latestCommit.hash
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

