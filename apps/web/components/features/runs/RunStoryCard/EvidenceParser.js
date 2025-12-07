'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.parseEvidenceToGitHubLink = parseEvidenceToGitHubLink
/**
 * Parses an evidence string in the format "path/to/file.tsx:128-133"
 * and converts it to a GitHub blob URL
 */
function parseEvidenceToGitHubLink(evidence, orgName, repoName, commitSha) {
  // Match pattern: filepath:startLine-endLine
  const match = evidence.match(/^(.+):(\d+)-(\d+)$/)
  if (!match) {
    return { text: evidence, url: null }
  }
  const filePath = match[1],
    startLine = match[2],
    endLine = match[3]
  if (!commitSha) {
    return { text: evidence, url: null }
  }
  const url = 'https://github.com/'
    .concat(orgName, '/')
    .concat(repoName, '/blob/')
    .concat(commitSha, '/')
    .concat(filePath, '#L')
    .concat(startLine, '-L')
    .concat(endLine)
  return { text: evidence, url }
}
