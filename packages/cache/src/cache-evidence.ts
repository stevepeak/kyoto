import { createHash } from 'node:crypto'
import type { Sandbox } from '@daytonaio/sdk'

/**
 * Generates a cache key for story evidence caching.
 *
 * The cache key is constructed using the story ID and the commit SHA,
 * separated by a colon (":").
 *
 * @param {Object} args - The arguments for constructing the cache key.
 * @param {string} args.storyId - The unique identifier of the user story.
 * @param {string} args.commitSha - The commit SHA representing the state of the repository.
 * @returns {string} The generated cache key in the format "storyId:commitSha".
 *
 * @example
 * const cacheKey = getCacheKey({ storyId: '123e4567-e89b-12d3-a456-426614174000', commitSha: 'abc123' });
 * // "123e4567-e89b-12d3-a456-426614174000:abc123"
 */
export function getCacheKey(args: {
  storyId: string
  commitSha: string
}): string {
  return `${args.storyId}:${args.commitSha}`
}

/**
 * Extracts unique file paths from an array of evidence strings.
 *
 * Each evidence string should be in the format "file:line-range", e.g., "src/auth/session.ts:12-28".
 * This function returns an array containing only the unique file paths
 * (e.g., "src/auth/session.ts" from "src/auth/session.ts:12-28").
 *
 * @param {string[]} evidence - An array of evidence strings in the "file:line-range" format.
 * @returns {string[]} An array of unique file paths extracted from the evidence.
 */
export function extractFilesFromEvidence(evidence: string[]): string[] {
  const files = new Set<string>()
  for (const item of evidence) {
    // Extract file path before the colon (if present)
    const filePath = item.split(':')[0]
    if (filePath) {
      files.add(filePath)
    }
  }
  return Array.from(files)
}

/**
 * Computes the SHA-256 hash of the provided file content.
 *
 * @param content - The file content as a string to hash.
 * @returns The SHA-256 hash of the content as a hexadecimal string.
 */
export function hashFileContent(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

/**
 * Retrieves the contents of the specified file from the Daytona sandbox and returns its SHA-256 hash.
 *
 * @param sandbox - The Daytona Sandbox instance to interact with.
 * @param filePath - The path to the file within the sandbox to hash.
 * @returns A promise that resolves to the SHA-256 hexadecimal hash of the file's contents.
 */

export async function getFileHashFromSandbox(
  filePath: string,
): Promise<string> {
  // TODO
  await new Promise((resolve: (value: string) => void) =>
    setTimeout(resolve, 1000),
  )
  console.log('getFileHashFromSandbox', filePath)
  // const contents = await getFileContentFromSandbox(sandbox, filePath)
  // return hashFileContent(contents)
  return '1234567890'
}

/**
 * Builds a hash map (Record) mapping each file referenced in the provided evidence array
 * to the SHA-256 hash of its contents and associated line ranges.
 *
 * @param evidence - An array of evidence strings (format: "file:line-range"),
 *                   from which all unique file paths will be extracted and hashed.
 * @param sandbox - The Daytona Sandbox instance used to read file contents.
 * @returns A Promise that resolves to a Record where each key is a file path and
 *          each value is an object containing the hash and line ranges.
 */
export async function buildEvidenceHashMap(
  evidence: string[],
  _sandbox: Sandbox,
): Promise<Record<string, { hash: string; lineRanges: string[] }>> {
  // Group line ranges by file path
  const fileLineRangesMap = new Map<string, Set<string>>()

  for (const item of evidence) {
    const colonIndex = item.indexOf(':')
    if (colonIndex === -1) {
      // No colon found, treat entire string as file path
      const filePath = item
      if (filePath) {
        if (!fileLineRangesMap.has(filePath)) {
          fileLineRangesMap.set(filePath, new Set())
        }
      }
    } else {
      const filePath = item.slice(0, colonIndex)
      const lineRange = item.slice(colonIndex + 1)
      if (filePath && lineRange) {
        if (!fileLineRangesMap.has(filePath)) {
          fileLineRangesMap.set(filePath, new Set())
        }
        fileLineRangesMap.get(filePath)!.add(lineRange)
      }
    }
  }

  const hashMap: Record<string, { hash: string; lineRanges: string[] }> = {}

  await Promise.all(
    Array.from(fileLineRangesMap.entries()).map(
      async ([filePath, lineRangesSet]) => {
        const hash = await getFileHashFromSandbox(filePath)
        hashMap[filePath] = {
          hash,
          lineRanges: Array.from(lineRangesSet),
        }
      },
    ),
  )

  return hashMap
}
