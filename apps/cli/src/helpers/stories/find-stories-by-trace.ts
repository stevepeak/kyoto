import { readAllStoryFiles } from '../file/reader'

interface FindStoriesByTraceOptions {
  files: string[]
}

/**
 * Finds stories that reference at least one of the provided files in their codeReferences.
 *
 * @param options - Options object containing array of file paths to trace
 * @returns Array of story file paths that reference any of the provided files
 */
export async function findStoriesByTrace({
  files,
}: FindStoriesByTraceOptions): Promise<string[]> {
  if (files.length === 0) {
    return []
  }

  // Read all story files
  let storyFiles
  try {
    storyFiles = await readAllStoryFiles()
  } catch {
    // If stories directory doesn't exist, return empty array
    return []
  }

  // Match files against story codeReferences
  const matchedStoryPaths = new Set<string>()

  for (const storyFile of storyFiles) {
    // Skip if already matched
    if (matchedStoryPaths.has(storyFile.path)) {
      continue
    }

    for (const codeRef of storyFile.story.codeReferences) {
      // Simple file path matching - check if any provided file matches the codeReference file
      const refFile = codeRef.file
      const matches = files.some((file) => {
        // Check if paths match (handle relative paths)
        return (
          file === refFile || file.endsWith(refFile) || refFile.endsWith(file)
        )
      })

      if (matches) {
        matchedStoryPaths.add(storyFile.path)
        // Only add each story once
        break
      }
    }
  }

  return Array.from(matchedStoryPaths)
}
