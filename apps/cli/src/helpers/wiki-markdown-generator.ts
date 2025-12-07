import type { StoryFile } from './story-file-reader.js'

export interface FolderMarkdown {
  folderPath: string
  markdown: string
  depth: number
}

interface GenerateFolderMarkdownOptions {
  summary: string
  mermaidChart: string
  stories: StoryFile[]
  folderPath: string
  depth: number
}

/**
 * Generates markdown content for a folder with summary, mermaid chart, and stories.
 */
export function generateFolderMarkdown(
  options: GenerateFolderMarkdownOptions,
): string {
  const { summary, mermaidChart, stories, folderPath, depth } = options

  // Create header based on depth
  const headerLevel = '#'.repeat(Math.min(depth + 1, 6))
  const folderName = folderPath.split('/').pop() || folderPath

  let markdown = `${headerLevel} ${folderName}\n\n`

  // Add summary section
  markdown += `## Summary\n\n${summary}\n\n`

  // Add mermaid chart section
  markdown += `## Flow Diagram\n\n\`\`\`mermaid\n${mermaidChart}\n\`\`\`\n\n`

  // Add stories section
  markdown += `## Stories\n\n`

  for (const storyFile of stories) {
    const story = storyFile.story

    // Story title (bold)
    markdown += `**${story.title}**\n\n`

    // Behavior in code block
    markdown += `\`\`\`\n${story.behavior}\n\`\`\`\n\n`

    // Details block with full JSON
    const storyJson = JSON.stringify(story, null, 2)
    markdown += `<details><summary>read more details</summary>\n\n`
    markdown += `\`\`\`json\n${storyJson}\n\`\`\`\n\n`
    markdown += `</details>\n\n`
  }

  return markdown
}

interface CombineMarkdownFilesOptions {
  folderMarkdowns: FolderMarkdown[]
  rootPath: string
}

/**
 * Combines all folder markdowns into a final root README.md.
 * Organizes by hierarchy depth and includes all content.
 */
export function combineMarkdownFiles(
  options: CombineMarkdownFilesOptions,
): string {
  const { folderMarkdowns } = options

  // Sort by depth (shallowest first) for top-down display
  const sorted = [...folderMarkdowns].sort((a, b) => a.depth - b.depth)

  let combined = `# Stories Documentation\n\n`
  combined += `This document provides a comprehensive overview of all user behavior stories organized by domain.\n\n`
  combined += `---\n\n`

  // Group by depth level for better organization
  const byDepth = new Map<number, FolderMarkdown[]>()
  for (const md of sorted) {
    const existing = byDepth.get(md.depth) || []
    existing.push(md)
    byDepth.set(md.depth, existing)
  }

  // Output each depth level
  for (const depth of Array.from(byDepth.keys()).sort()) {
    const markdowns = byDepth.get(depth) || []

    for (const folderMd of markdowns) {
      combined += folderMd.markdown
      combined += `\n---\n\n`
    }
  }

  return combined
}


