/**
 * Parses a commit specification from CLI-style inputs.
 *
 * Supports commit specs as negative numbers (e.g., `-1`, `-4`) meaning "last N commits",
 * or as a commit SHA. Also supports overriding with explicit `--commits` and `--commit`.
 */
export type ParseCommitSpecResult = {
  commitCount?: number
  commitSha?: string
}

export function parseCommitSpec(args: {
  commitSpec: string | undefined
  commitsOption: string | undefined
  commitOption: string | undefined
}): ParseCommitSpecResult {
  let commitCount: number | undefined
  let commitSha: string | undefined = args.commitOption

  // Parse commit specification from argument (e.g., -1, -4, or SHA)
  if (args.commitSpec) {
    // Check if it's a negative number (commit count)
    if (args.commitSpec.startsWith('-')) {
      const num = Number.parseInt(args.commitSpec, 10)
      if (!Number.isNaN(num) && num < 0) {
        commitCount = Math.abs(num)
      }
    } else {
      // Assume it's a commit SHA
      commitSha = args.commitSpec
    }
  }

  // Override with --commits flag if provided
  if (args.commitsOption) {
    const count = Number.parseInt(args.commitsOption, 10)
    if (!Number.isNaN(count) && count > 0) {
      commitCount = count
    }
  }

  return { commitCount, commitSha }
}
