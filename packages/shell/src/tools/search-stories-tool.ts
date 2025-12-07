import { tool } from 'ai'
import { z } from 'zod'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { findGitRoot } from '../git/find-git-root.js'

const searchStoriesInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .max(500)
    .describe(
      'Search query to find relevant stories. Can be keywords, phrases, or semantic descriptions.',
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe('Maximum number of stories to return'),
})

interface StorySearchResult {
  filePath: string
  title: string
  behavior: string
  content: string
}

/**
 * Simple text-based search through story files.
 * Searches in title, behavior, and acceptance criteria.
 * Returns stories that match the query terms.
 */
async function searchStories(
  query: string,
  limit: number,
): Promise<StorySearchResult[]> {
  const gitRoot = await findGitRoot()
  const storiesDir = join(gitRoot, '.kyoto', 'stories')

  const results: StorySearchResult[] = []
  const queryLower = query.toLowerCase()
  const queryTerms = queryLower.split(/\s+/).filter((term) => term.length > 0)

  async function searchDir(
    dirPath: string,
    relativePath: string = '',
  ): Promise<void> {
    try {
      const entries = await readdir(dirPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name)

        if (entry.isDirectory()) {
          const newRelativePath = relativePath
            ? join(relativePath, entry.name)
            : entry.name
          await searchDir(fullPath, newRelativePath)
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await readFile(fullPath, 'utf-8')
            const story = JSON.parse(content)

            // Build searchable content
            const title = story.title || ''
            const behavior = story.behavior || ''
            const acceptanceCriteria = Array.isArray(story.acceptanceCriteria)
              ? story.acceptanceCriteria.join(' ')
              : ''
            const searchableContent =
              `${title} ${behavior} ${acceptanceCriteria}`.toLowerCase()

            // Simple text matching - check if any query terms appear in the content
            const matches = queryTerms.some((term) =>
              searchableContent.includes(term),
            )

            if (matches) {
              const storyPath = relativePath
                ? join('.kyoto', 'stories', relativePath, entry.name)
                : join('.kyoto', 'stories', entry.name)

              results.push({
                filePath: storyPath,
                title,
                behavior,
                content: JSON.stringify(story, null, 2),
              })

              if (results.length >= limit) {
                return
              }
            }
          } catch {
            // Skip files that can't be parsed
            continue
          }
        }
      }
    } catch {
      // Skip directories that can't be read
      return
    }
  }

  try {
    await searchDir(storiesDir)
  } catch {
    // If stories directory doesn't exist, return empty results
    return []
  }

  return results.slice(0, limit)
}

export function createSearchStoriesTool() {
  return tool({
    name: 'searchStories',
    description:
      'Search through user stories in .kyoto/stories directory. Returns matching stories with their file paths, titles, behaviors, and content. Use this to find stories that might be impacted by code changes.',
    inputSchema: searchStoriesInputSchema,
    execute: async (input) => {
      const results = await searchStories(input.query, input.limit || 10)

      if (results.length === 0) {
        return JSON.stringify({
          message: 'No stories found matching the query',
          results: [],
        })
      }

      return JSON.stringify(
        {
          count: results.length,
          results: results.map((r) => ({
            filePath: r.filePath,
            title: r.title,
            behavior: r.behavior,
          })),
          // Include full content for detailed analysis
          details: results.map((r) => ({
            filePath: r.filePath,
            content: r.content,
          })),
        },
        null,
        2,
      )
    },
  })
}
