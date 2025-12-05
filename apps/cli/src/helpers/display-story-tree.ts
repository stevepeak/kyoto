import { readdir, readFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import chalk from 'chalk'
import type { Story } from './story-generator-agent.js'

const STORIES_DIR = '.stories'

interface TreeNode {
  name: string
  type: 'directory' | 'file'
  children?: TreeNode[]
  title?: string
  path: string
}

/**
 * Recursively reads all story files from the .stories directory.
 */
async function readStoryFilesRecursive(
  dirPath: string,
  basePath: string = '',
): Promise<Array<{ path: string; relativePath: string; title: string }>> {
  const stories: Array<{ path: string; relativePath: string; title: string }> =
    []
  const entries = await readdir(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name)
    const relativePath = basePath ? join(basePath, entry.name) : entry.name

    if (entry.isDirectory()) {
      const nested = await readStoryFilesRecursive(fullPath, relativePath)
      stories.push(...nested)
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      try {
        const content = await readFile(fullPath, 'utf-8')
        const story = JSON.parse(content) as Story
        stories.push({
          path: fullPath,
          relativePath,
          title: story.title,
        })
      } catch {
        // Skip files that can't be parsed
      }
    }
  }

  return stories
}

/**
 * Builds a tree structure from story file paths.
 */
function buildTree(
  stories: Array<{ path: string; relativePath: string; title: string }>,
): TreeNode {
  const root: TreeNode = {
    name: STORIES_DIR,
    type: 'directory',
    children: [],
    path: '',
  }

  for (const story of stories) {
    const parts = story.relativePath.split('/')
    const filename = parts.pop()!
    const dirParts = parts

    let current = root
    const pathParts: string[] = []
    for (const dirPart of dirParts) {
      pathParts.push(dirPart)
      let child = current.children?.find(
        (c) => c.name === dirPart && c.type === 'directory',
      )
      if (!child) {
        child = {
          name: dirPart,
          type: 'directory',
          children: [],
          path: pathParts.join('/'),
        }
        if (!current.children) {
          current.children = []
        }
        current.children.push(child)
      }
      current = child
    }

    if (!current.children) {
      current.children = []
    }
    current.children.push({
      name: filename,
      type: 'file',
      title: story.title,
      path: story.relativePath,
    })
  }

  return root
}

/**
 * Formats a tree node for display.
 */
function formatTreeNode(
  node: TreeNode,
  prefix: string = '',
  isLast: boolean = true,
): string[] {
  const lines: string[] = []
  const connector = isLast ? '└── ' : '├── '
  const nextPrefix = isLast ? '    ' : '│   '

  if (node.type === 'directory') {
    lines.push(
      prefix + connector + chalk.hex('#7ba179')(node.name) + '/',
    )
    if (node.children && node.children.length > 0) {
      const sortedChildren = [...node.children].sort((a, b) => {
        // Directories first, then files
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })
      for (let i = 0; i < sortedChildren.length; i++) {
        const child = sortedChildren[i]
        const isLastChild = i === sortedChildren.length - 1
        const childLines = formatTreeNode(
          child,
          prefix + nextPrefix,
          isLastChild,
        )
        lines.push(...childLines)
      }
    }
  } else {
    // File - show title instead of filename
    const displayName = node.title || node.name.replace(/\.json$/, '')
    lines.push(
      prefix +
        connector +
        chalk.white(displayName) +
        chalk.grey(` (${node.name})`),
    )
  }

  return lines
}

/**
 * Displays a tree structure of organized story files.
 */
export async function displayStoryTree(
  logger: (message: string) => void,
): Promise<void> {
  const storiesDir = resolve(process.cwd(), STORIES_DIR)

  try {
    const stories = await readStoryFilesRecursive(storiesDir)
    if (stories.length === 0) {
      return
    }

    const tree = buildTree(stories)
    
    // Skip the root .stories node and display its children directly
    const lines: string[] = []
    if (tree.children && tree.children.length > 0) {
      const sortedChildren = [...tree.children].sort((a, b) => {
        // Directories first, then files
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })
      for (let i = 0; i < sortedChildren.length; i++) {
        const child = sortedChildren[i]
        const isLastChild = i === sortedChildren.length - 1
        const childLines = formatTreeNode(child, '', isLastChild)
        lines.push(...childLines)
      }
    }

    logger(chalk.grey('\nOrganized structure:\n'))
    for (const line of lines) {
      logger(line)
    }
    logger('')
  } catch {
    // Silently fail if we can't read the tree
  }
}

