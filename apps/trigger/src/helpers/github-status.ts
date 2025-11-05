import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'

interface CreateGitHubCheckParams {
  orgSlug: string
  repoName: string
  commitSha: string
  appId: number
  privateKey: string
  installationId: number
  name: string
  status: 'queued' | 'in_progress' | 'completed'
  conclusion?:
    | 'success'
    | 'failure'
    | 'neutral'
    | 'cancelled'
    | 'timed_out'
    | 'action_required'
  output?: {
    title: string
    summary: string
    text?: string
  }
}

interface UpdateGitHubCheckParams extends CreateGitHubCheckParams {
  checkRunId: number
}

/**
 * Creates a GitHub check run
 */
export async function createGitHubCheck(
  params: CreateGitHubCheckParams,
): Promise<number> {
  const {
    orgSlug,
    repoName,
    commitSha,
    appId,
    privateKey,
    installationId,
    name,
    status,
    conclusion,
    output,
  } = params

  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: { appId, privateKey, installationId },
  })

  const checkRun = await octokit.rest.checks.create({
    owner: orgSlug,
    repo: repoName,
    name,
    head_sha: commitSha,
    status,
    conclusion,
    output,
  })

  return checkRun.data.id
}

/**
 * Updates an existing GitHub check run
 */
export async function updateGitHubCheck(
  params: UpdateGitHubCheckParams,
): Promise<void> {
  const {
    orgSlug,
    repoName,
    appId,
    privateKey,
    installationId,
    checkRunId,
    status,
    conclusion,
    output,
  } = params

  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: { appId, privateKey, installationId },
  })

  await octokit.rest.checks.update({
    owner: orgSlug,
    repo: repoName,
    check_run_id: checkRunId,
    status,
    conclusion,
    output,
  })
}

/**
 * Maps run status to GitHub check conclusion
 */
export function mapRunStatusToConclusion(
  status: 'pass' | 'fail' | 'skipped' | 'running',
): 'success' | 'failure' | 'neutral' | 'cancelled' | undefined {
  switch (status) {
    case 'pass':
      return 'success'
    case 'fail':
      return 'failure'
    case 'skipped':
      return 'neutral'
    case 'running':
      return undefined
    default:
      return undefined
  }
}

/**
 * Maps run status to GitHub check status
 */
export function mapRunStatusToCheckStatus(
  status: 'pass' | 'fail' | 'skipped' | 'running',
): 'queued' | 'in_progress' | 'completed' {
  switch (status) {
    case 'running':
      return 'in_progress'
    case 'pass':
    case 'fail':
    case 'skipped':
      return 'completed'
    default:
      return 'queued'
  }
}
