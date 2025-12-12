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
