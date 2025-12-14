import { generateText } from 'ai'
import { execa } from 'execa'
import { Box, Text, useApp } from 'ink'
import Spinner from 'ink-spinner'
import { useEffect, useState } from 'react'
import { dedent } from 'ts-dedent'

import { init } from '../../helpers/init'
import { Jumbo } from '../../ui/jumbo'

async function getGitDiff(args: {
  gitRoot: string
  staged: boolean
}): Promise<string> {
  try {
    const { stdout } = await execa(
      'git',
      args.staged ? ['diff', '--cached'] : ['diff'],
      {
        cwd: args.gitRoot,
      },
    )
    return stdout
  } catch {
    return ''
  }
}

export default function Diff(): React.ReactElement {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<string>('Initializing...')
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const runAnalysis = async (): Promise<void> => {
      try {
        const { fs, git, model } = await init()

        // Check if there are any changes
        if (!git.hasChanges) {
          setError('No uncommitted changes found.')
          setLoading(false)
          await new Promise((resolve) => {
            setTimeout(() => {
              resolve(undefined)
            }, 200)
          })
          if (!cancelled) {
            exit()
          }
          return
        }

        setProgress('Collecting git changes...')

        // Get both staged and unstaged diffs
        const [stagedDiff, unstagedDiff] = await Promise.all([
          getGitDiff({ gitRoot: fs.gitRoot, staged: true }),
          getGitDiff({ gitRoot: fs.gitRoot, staged: false }),
        ])

        const hasStaged = stagedDiff.trim().length > 0
        const hasUnstaged = unstagedDiff.trim().length > 0

        if (!hasStaged && !hasUnstaged) {
          setError('No changes found in git diff.')
          setLoading(false)
          await new Promise((resolve) => {
            setTimeout(() => {
              resolve(undefined)
            }, 200)
          })
          if (!cancelled) {
            exit()
          }
          return
        }

        // Combine diffs for analysis
        let combinedDiff = ''
        if (hasStaged && hasUnstaged) {
          combinedDiff = `=== STAGED CHANGES ===\n${stagedDiff}\n\n=== UNSTAGED CHANGES ===\n${unstagedDiff}`
        } else if (hasStaged) {
          combinedDiff = `=== STAGED CHANGES ===\n${stagedDiff}`
        } else {
          combinedDiff = `=== UNSTAGED CHANGES ===\n${unstagedDiff}`
        }

        // Use AI to analyze and summarize
        const result = await generateText({
          model,
          prompt: dedent`
            Analyze the following git changes and produce an extremely brief, two-tier summary.

            Output rules (strict):
            - Output MUST be plain text (no markdown).
            - Then write exactly ONE short sentence (max 18 words). Use simple words. No jargon.
            - Then output a blank line.
            - Only include extra detail if it helps disambiguate what changed. If not needed, output: none
            - If details ARE needed, output at most 3 short bullet points using "- " prefixes.
            - Do not mention file names unless absolutely necessary.
            - Total output should be at most ~8 lines.
            
            Git changes:
            ${combinedDiff}
          `,
        })

        if (!cancelled) {
          setSummary(result.text.trim())
          setLoading(false)

          // Auto-exit after showing results
          await new Promise((resolve) => {
            setTimeout(() => {
              resolve(undefined)
            }, 200)
          })
          if (!cancelled) {
            exit()
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to analyze changes',
          )
          setLoading(false)
          await new Promise((resolve) => {
            setTimeout(() => {
              resolve(undefined)
            }, 200)
          })
          if (!cancelled) {
            exit()
          }
        }
      }
    }

    void runAnalysis()

    return () => {
      cancelled = true
    }
  }, [exit])

  return (
    <Box flexDirection="column">
      <Jumbo />
      <Text> </Text>
      <Box flexDirection="column" marginBottom={1}>
        {loading && (
          <Box>
            <Text color="cyan">
              <Spinner type="dots" />
            </Text>
            <Text> {progress}</Text>
          </Box>
        )}
        {error && (
          <Box flexDirection="column">
            <Text color="red">✗ {error}</Text>
          </Box>
        )}
        {summary && (
          <Box flexDirection="column">
            <Text>{summary}</Text>
          </Box>
        )}
      </Box>
      <Text> </Text>
      <Text> </Text>
    </Box>
  )
}
