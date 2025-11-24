import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'
import { setupDb } from '@app/db'
import { getConfig } from '@app/config'
import { logger } from '@trigger.dev/sdk'

export function createOctokit(installationId: number): Octokit {
  const env = getConfig()
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: env.GITHUB_APP_ID,
      privateKey: env.GITHUB_APP_PRIVATE_KEY,
      installationId,
    },
  })
}

interface RepoWithOctokit {
  repo: {
    repoName: string
    ownerLogin: string
    installationId: number
  }
  octokit: Octokit
}

async function getRepoWithOctokit(repoId: string): Promise<RepoWithOctokit> {
  const env = getConfig()
  const db = setupDb(env.DATABASE_URL)

  const repo = await db
    .selectFrom('repos')
    .innerJoin('owners', 'repos.ownerId', 'owners.id')
    .select([
      'repos.name as repoName',
      'owners.login as ownerLogin',
      'owners.installationId',
    ])
    .where('repos.id', '=', repoId)
    .executeTakeFirst()

  if (!repo || !repo.installationId) {
    throw new Error('Repository or installation not found or misconfigured')
  }

  const octokit = createOctokit(Number(repo.installationId))

  return {
    repo: {
      repoName: repo.repoName,
      ownerLogin: repo.ownerLogin,
      installationId: Number(repo.installationId),
    },
    octokit,
  }
}

interface OctokitClient extends RepoWithOctokit {
  token: string
}

export async function getOctokitClient(repoId: string): Promise<OctokitClient> {
  const { repo, octokit } = await getRepoWithOctokit(repoId)
  const authResult = await octokit.auth({ type: 'installation' })

  const token =
    typeof authResult === 'string'
      ? authResult
      : authResult && typeof authResult === 'object' && 'token' in authResult
        ? (authResult.token as string | undefined)
        : undefined

  if (!token) {
    throw new Error('Failed to generate GitHub installation token')
  }

  return {
    repo,
    octokit,
    token,
  }
}

export interface GitAuthor {
  id: number | string | null
  login: string | null
  name: string | null
}

interface BranchDetails {
  commitSha: string
  commitMessage: string
}

export async function getGithubCommitAuthor(
  octokit: Octokit,
  params: {
    owner: string
    repo: string
    commitSha: string
  },
): Promise<GitAuthor | null> {
  try {
    const commitData = await octokit.rest.repos.getCommit({
      owner: params.owner,
      repo: params.repo,
      ref: params.commitSha,
    })

    const author = commitData.data.author
    const commit = commitData.data.commit

    if (!author) {
      // If author is not available, try to get from commit author info
      const commitAuthor = commit?.author
      if (commitAuthor?.name) {
        return {
          id: null,
          login: null,
          name: commitAuthor.name,
        }
      }
      return null
    }

    return {
      id: author.id ?? null,
      login: author.login ?? null,
      name: author.name ?? commit?.author?.name ?? null,
    }
  } catch (_error) {
    return null
  }
}

export async function getGithubBranchDetails(
  octokit: Octokit,
  params: {
    owner: string
    repo: string
    branch: string
  },
): Promise<BranchDetails> {
  const branchData = await octokit.rest.repos.getBranch({
    owner: params.owner,
    repo: params.repo,
    branch: params.branch,
  })

  const commitSha = branchData.data.commit?.sha ?? null
  const commitMessage = branchData.data.commit?.commit?.message ?? null

  return {
    commitSha,
    commitMessage,
  }
}

/**
 * Get code diff from GitHub between two commits
 * Filters to only TypeScript/TSX files and truncates to avoid context overflow
 * Note: The sandbox can be used for full context if needed
 */
export async function getGitHubDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  base: string,
  head: string,
  maxDiffSize: number = 50000, // ~50KB max diff size
): Promise<{ diff: string; changedFiles: string[] }> {
  logger.info('Fetching diff from GitHub', {
    owner,
    repo,
    base,
    head,
  })

  const comparison = await octokit.rest.repos.compareCommits({
    owner,
    repo,
    base,
    head,
  })

  // Filter to only TypeScript/TSX files
  const tsFiles =
    comparison.data.files?.filter(
      (file) => file.filename.endsWith('.ts') || file.filename.endsWith('.tsx'),
    ) || []

  // Build diff string, truncating if necessary
  let diff = ''
  let totalSize = 0
  const truncatedFiles: string[] = []

  for (const file of tsFiles) {
    const fileDiff = `diff --git a/${file.filename} b/${file.filename}\nindex ${file.sha}..${file.sha}\n--- a/${file.filename}\n+++ b/${file.filename}\n${file.patch || ''}`
    const fileDiffSize = fileDiff.length

    if (totalSize + fileDiffSize > maxDiffSize) {
      // Truncate this file's diff if adding it would exceed the limit
      const remainingSpace = maxDiffSize - totalSize
      if (remainingSpace > 100) {
        // Only add if we have meaningful space left
        const truncatedPatch = file.patch
          ? file.patch.substring(0, remainingSpace - 200) +
            '\n... (diff truncated - use sandbox for full context)'
          : ''
        diff += `diff --git a/${file.filename} b/${file.filename}\nindex ${file.sha}..${file.sha}\n--- a/${file.filename}\n+++ b/${file.filename}\n${truncatedPatch}\n\n`
        truncatedFiles.push(file.filename)
      }
      break
    }

    diff += fileDiff + '\n\n'
    totalSize += fileDiffSize
  }

  const changedFiles = tsFiles.map((file) => file.filename)

  if (truncatedFiles.length > 0) {
    logger.info('Diff truncated due to size limit', {
      owner,
      repo,
      truncatedFileCount: truncatedFiles.length,
      totalSize,
      maxDiffSize,
      truncatedFiles,
    })
  }

  logger.info('Fetched diff from GitHub', {
    owner,
    repo,
    changedFileCount: changedFiles.length,
    diffLength: diff.length,
    truncatedFileCount: truncatedFiles.length,
  })

  return { diff, changedFiles }
}

/**
 * Get commit messages for a range of commits
 */
export async function getCommitMessages(
  octokit: Octokit,
  owner: string,
  repo: string,
  base: string,
  head: string,
): Promise<string[]> {
  logger.info('Fetching commit messages', {
    owner,
    repo,
    base,
    head,
  })

  const commits = await octokit.rest.repos.compareCommits({
    owner,
    repo,
    base,
    head,
  })

  const messages =
    commits.data.commits
      ?.map((commit) => commit.commit.message)
      .filter(Boolean) || []

  logger.info('Fetched commit messages', {
    owner,
    repo,
    commitCount: messages.length,
  })

  return messages
}
