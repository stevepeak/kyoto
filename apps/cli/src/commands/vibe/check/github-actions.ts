/**
 * Detects if we're running in GitHub Actions.
 */
export function isGitHubActions(): boolean {
  // eslint-disable-next-line no-process-env
  return process.env.GITHUB_ACTIONS === 'true'
}

/**
 * Gets the GitHub Actions event name (e.g., 'push', 'pull_request').
 */
export function getGitHubEventName(): string | null {
  // eslint-disable-next-line no-process-env
  return process.env.GITHUB_EVENT_NAME ?? null
}

/**
 * Gets the base ref for a pull request event.
 */
export function getGitHubBaseRef(): string | null {
  // eslint-disable-next-line no-process-env
  return process.env.GITHUB_BASE_REF ?? null
}

/**
 * Gets the head ref for a pull request event.
 */
export function getGitHubHeadRef(): string | null {
  // eslint-disable-next-line no-process-env
  return process.env.GITHUB_HEAD_REF ?? null
}

/**
 * Gets the GitHub context for creating check runs and annotations.
 * Returns null if not in GitHub Actions or required env vars are missing.
 */
export function getGitHubContext(): {
  owner: string
  repo: string
  sha: string
  token: string
} | null {
  // eslint-disable-next-line no-process-env
  if (process.env.GITHUB_ACTIONS !== 'true') {
    return null
  }

  // eslint-disable-next-line no-process-env
  const repository = process.env.GITHUB_REPOSITORY
  // eslint-disable-next-line no-process-env
  const sha = process.env.GITHUB_SHA
  // eslint-disable-next-line no-process-env
  const token = process.env.GITHUB_TOKEN

  if (!repository || !sha || !token) {
    return null
  }

  const [owner, repo] = repository.split('/')
  if (!owner || !repo) {
    return null
  }

  return {
    owner,
    repo,
    sha,
    token,
  }
}
