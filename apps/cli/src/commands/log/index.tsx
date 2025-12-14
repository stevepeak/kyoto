import { findGitRoot } from '@app/shell'
import { execa } from 'execa'
import { Box, Text, useApp } from 'ink'
import { useEffect, useMemo, useState } from 'react'

import { Header } from '../../ui/header'
import { Jumbo } from '../../ui/jumbo'

type CommitRow = {
  graph: string
  sha: string
  commitSec: number
  subject: string
  author: string
  refs: string | null
}

const FIELD_SEP = '\u001f' // unit separator (unlikely to appear in subjects)

function formatCompactAge(args: { nowSec: number; commitSec: number }): string {
  const deltaSec = Math.max(0, Math.floor(args.nowSec - args.commitSec))

  if (deltaSec < 60) {
    return `${deltaSec}s`
  }

  const deltaMin = Math.floor(deltaSec / 60)
  if (deltaMin < 60) {
    return `${deltaMin}m`
  }

  const deltaHrs = Math.floor(deltaMin / 60)
  if (deltaHrs < 24) {
    return `${deltaHrs}h`
  }

  const deltaDays = Math.floor(deltaHrs / 24)
  if (deltaDays < 7) {
    return `${deltaDays}d`
  }

  const deltaWeeks = Math.floor(deltaDays / 7)
  if (deltaWeeks < 4) {
    return `${deltaWeeks}w`
  }

  const deltaMonths = Math.floor(deltaDays / 30)
  if (deltaMonths < 12) {
    return `${deltaMonths}mo`
  }

  const deltaYears = Math.floor(deltaDays / 365)
  return `${deltaYears}y`
}

function parseGitLogLine(line: string): CommitRow | null {
  const sepIndex = line.indexOf(FIELD_SEP)
  if (sepIndex < 0) {
    return null
  }

  const graph = line.slice(0, sepIndex)
  const rest = line.slice(sepIndex + FIELD_SEP.length)
  const parts = rest.split(FIELD_SEP)

  const sha = parts[0]?.trim()
  const commitSecRaw = parts[1]?.trim()
  const subject = parts[2] ?? ''
  const author = parts[3] ?? ''
  const refsRaw = parts[4] ?? ''

  if (!sha || !commitSecRaw) {
    return null
  }

  const commitSec = Number.parseInt(commitSecRaw, 10)
  if (!Number.isFinite(commitSec)) {
    return null
  }

  const refs = refsRaw.trim().length > 0 ? refsRaw.trim() : null

  return {
    graph,
    sha,
    commitSec,
    subject: subject.trim(),
    author: author.trim(),
    refs,
  }
}

async function getGitLogRows(args: {
  gitRoot: string
  limit: number
  graph: boolean
}): Promise<CommitRow[]> {
  const format = [`${FIELD_SEP}%h`, '%ct', '%s', '%an', '%d'].join(FIELD_SEP)

  const commandArgs = [
    '--no-pager',
    'log',
    `-n`,
    String(args.limit),
    '--abbrev=6',
    '--no-color',
    args.graph ? '--graph' : '--no-graph',
    `--format=${format}`,
  ]

  const result = await execa('git', commandArgs, { cwd: args.gitRoot })
  const lines = result.stdout.split('\n').filter((l) => l.trim().length > 0)

  return lines.map(parseGitLogLine).filter((r): r is CommitRow => r !== null)
}

export default function Log(args: {
  limit?: number
  graph?: boolean
}): React.ReactElement {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<CommitRow[]>([])

  const limit = useMemo(() => Math.max(1, Math.floor(args.limit ?? 10)), [args])
  const graph = useMemo(() => args.graph ?? true, [args])

  useEffect(() => {
    let cancelled = false

    const run = async (): Promise<void> => {
      try {
        const gitRoot = await findGitRoot()
        const nextRows = await getGitLogRows({ gitRoot, limit, graph })

        if (!cancelled) {
          setRows(nextRows)
          setLoading(false)
          setTimeout(() => {
            exit()
          }, 150)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to read git log')
          setLoading(false)
          setTimeout(() => {
            exit()
          }, 300)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [exit, graph, limit])

  const nowSec = Math.floor(Date.now() / 1000)

  return (
    <Box flexDirection="column">
      <Jumbo />
      <Header kanji="歴史" title="Git log" />

      <Box flexDirection="column" marginTop={1} marginBottom={1}>
        {loading ? (
          <Text dimColor>Collecting commits…</Text>
        ) : error ? (
          <Box flexDirection="column">
            <Text color="red">✗ Failed to load git log</Text>
            <Text dimColor>{error}</Text>
          </Box>
        ) : rows.length === 0 ? (
          <Text dimColor>No commits found.</Text>
        ) : (
          rows.map((row, idx) => {
            const age = formatCompactAge({ nowSec, commitSec: row.commitSec })

            return (
              <Box key={`${row.sha}-${idx}`} flexDirection="row">
                {row.graph.length > 0 ? (
                  <Text color="gray">{row.graph}</Text>
                ) : null}
                <Text> </Text>
                <Box width={8}>
                  <Text color="cyan">{row.sha}</Text>
                </Box>
                <Box width={6}>
                  <Text dimColor>{age}</Text>
                </Box>
                <Text bold wrap="truncate">
                  {row.subject}
                </Text>
                <Text> </Text>
                <Text dimColor>- {row.author}</Text>
                {row.refs ? (
                  <>
                    <Text> </Text>
                    <Text color="magenta">{row.refs}</Text>
                  </>
                ) : null}
              </Box>
            )
          })
        )}
      </Box>
    </Box>
  )
}
