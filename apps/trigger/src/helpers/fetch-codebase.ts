import type { Octokit } from '@octokit/rest'

export interface CodebaseFile {
  path: string
  content: string
}

interface FetchRepositoryCodebaseParams {
  octokit: Octokit
  owner: string
  repo: string
  branch: string
}

/**
 * Fetches the repository codebase at depth 1 (root level files only)
 * Filters out non-code files like node_modules, .git, etc.
 */
export async function fetchRepositoryCodebase(
  params: FetchRepositoryCodebaseParams,
): Promise<CodebaseFile[]> {
  const { octokit, owner, repo, branch } = params

  // Get the branch reference to get the tree SHA
  const branchRef = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  })

  const commitSha = branchRef.data.object.sha

  // Get the commit to get the tree SHA
  const commit = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: commitSha,
  })

  const treeSha = commit.data.tree.sha

  // Get the tree at depth 1
  // We'll fetch recursively and filter to depth 1 (root + first-level directories only)
  const tree = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive: '1',
  })

  // Filter to only include code files and exclude common non-code directories/files
  const codeFileExtensions = [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.py',
    '.java',
    '.go',
    '.rs',
    '.rb',
    '.php',
    '.swift',
    '.kt',
    '.scala',
    '.cs',
    '.cpp',
    '.c',
    '.h',
    '.hpp',
    '.vue',
    '.svelte',
    '.astro',
    '.md',
    '.json',
    '.yaml',
    '.yml',
    '.toml',
    '.xml',
    '.sql',
    '.sh',
    '.bash',
    '.zsh',
    '.fish',
    '.dockerfile',
    '.makefile',
    '.cmake',
    '.gradle',
    '.m',
    '.mm',
    '.hpp',
    '.cc',
    '.cxx',
  ]

  const excludedPaths = [
    'node_modules',
    '.git',
    '.next',
    '.nuxt',
    '.cache',
    'dist',
    'build',
    'out',
    'coverage',
    '.nyc_output',
    '.vscode',
    '.idea',
    '.DS_Store',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '.env',
    '.env.local',
    '.env.production',
    '.env.development',
    'vendor',
    '__pycache__',
    '.pytest_cache',
    '.mypy_cache',
    'target',
    '.gradle',
    '.class',
    '.jar',
    '.war',
    '.ear',
  ]

  const files: CodebaseFile[] = []

  // Process tree items - only files (type === 'blob') at depth 1
  for (const item of tree.data.tree) {
    if (item.type !== 'blob') {
      continue
    }

    const path = item.path ?? ''
    if (!path) {
      continue
    }

    // Filter to depth 1 only (root level or first-level directories)
    const pathParts = path.split('/')
    if (pathParts.length > 2) {
      // Skip files deeper than depth 1
      continue
    }

    // Check if path should be excluded
    const shouldExclude = excludedPaths.some((excluded) =>
      path.includes(excluded),
    )
    if (shouldExclude) {
      continue
    }

    // Check if file has a code extension or is a root-level config file
    const hasCodeExtension = codeFileExtensions.some((ext) =>
      path.toLowerCase().endsWith(ext),
    )
    const isRootConfigFile =
      path.split('/').length === 1 &&
      [
        'package.json',
        'tsconfig.json',
        'pyproject.toml',
        'Cargo.toml',
      ].includes(path)

    if (!hasCodeExtension && !isRootConfigFile) {
      continue
    }

    try {
      // Fetch file content
      const contentResponse = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      })

      if (
        !Array.isArray(contentResponse.data) &&
        'content' in contentResponse.data &&
        contentResponse.data.encoding === 'base64'
      ) {
        const content = Buffer.from(
          contentResponse.data.content,
          'base64',
        ).toString('utf-8')
        files.push({ path, content })
      }
    } catch (error) {
      // Skip files that can't be fetched (e.g., binary files, symlinks)
      console.warn(`Failed to fetch file ${path}:`, error)
      continue
    }
  }

  return files
}
