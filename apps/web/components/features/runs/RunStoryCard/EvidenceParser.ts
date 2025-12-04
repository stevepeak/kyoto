/**
 * Parses an evidence string in the format "path/to/file.tsx:128-133"
 * and converts it to a GitHub blob URL
 */
export function parseEvidenceToGitHubLink(
  evidence: string,
  orgName: string,
  repoName: string,
  commitSha: string | null,
): { text: string; url: string | null } {
  // Match pattern: filepath:startLine-endLine
  const match = evidence.match(/^(.+):(\d+)-(\d+)$/)

  if (!match) {
    return { text: evidence, url: null }
  }

  const [, filePath, startLine, endLine] = match

  if (!commitSha) {
    return { text: evidence, url: null }
  }

  const url = `https://github.com/${orgName}/${repoName}/blob/${commitSha}/${filePath}#L${startLine}-L${endLine}`

  return { text: evidence, url }
}
