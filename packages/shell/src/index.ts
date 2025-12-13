// Git
export { findGitRoot } from './git/find-git-root'
export { getChangedTsFiles } from './git/get-changed-ts-files'
export { getChangedTsFilesFromCommits } from './git/get-changed-ts-files-from-commits'
export { getUncommittedFilePaths } from './git/get-uncommitted-file-paths'
export { getStagedTsFiles } from './git/get-staged-ts-files'
export { getUnstagedTsFiles } from './git/get-unstaged-ts-files'
export {
  type CommitInfo,
  getCurrentCommitSha,
  getLatestCommit,
} from './git/get-latest-commit'
export { getRecentCommits } from './git/get-recent-commits'
export { getPrCommits } from './git/get-pr-commits'
export { getCommitsRange } from './git/get-commits-range'
export { getCurrentBranch } from './git/get-current-branch'
export { getGitHubInfo, type GitHubInfo } from './git/get-github-info'
export {
  hasChanges,
  hasStagedChanges,
  isBranchClean,
} from './git/get-git-status'
export { runGit } from './git/run-git'
export {
  getScopeContext,
  getScopeDiffs,
  getScopeFileContents,
  getScopeFilePaths,
  type ScopeContext,
} from './git/get-scope-content'
export {
  parseCommitSpec,
  type ParseCommitSpecResult,
} from './git/parse-commit-spec'

// Tools
export { createLocalReadFileTool, readLocalFile } from './tools/read-file-tool'
export { createLocalTerminalCommandTool } from './tools/terminal-command-tool'
export {
  createLocalCreateDirectoryTool,
  createLocalDirectory,
} from './tools/create-directory-tool'
export { createLocalUpdateStoryTool } from './tools/update-story-tool'
export { writeLocalFile } from './tools/write-file-tool'
export { createGitHubChecksTool } from './tools/github-checks-tool'

// Utils
export { formatScopeDescription } from './utils/format-scope-description'
