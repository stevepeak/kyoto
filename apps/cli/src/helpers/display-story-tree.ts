import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import chalk from 'chalk'
import treeify from 'object-treeify'
import type { Story } from './story-generator-agent.js'
import { findKyotoDir } from './find-kyoto-dir.js'

const STORIES_DIR = '.kyoto'

interface TreeNode {
  name: string
  type: 'directory' | 'file'
  children?: TreeNode[]
  title?: string
  path: string
}

/**
 * Recursively reads all story files from the .kyoto directory.
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
 * Converts a TreeNode to the format expected by object-treeify.
 * Uses plain strings (colors applied later).
 */
function convertToTreeifyFormat(node: TreeNode): Record<string, any> {
  const result: Record<string, any> = {}

  if (node.type === 'directory') {
    if (node.children && node.children.length > 0) {
      // Sort children: directories first, then files
      const sortedChildren = [...node.children].sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })

      for (const child of sortedChildren) {
        if (child.type === 'directory') {
          result[child.name] = convertToTreeifyFormat(child)
        } else {
          // File - use title if available, otherwise filename
          const displayName = child.title || child.name.replace(/\.json$/, '')
          result[displayName] = null
        }
      }
    }
  }

  return result
}

/**
 * Displays a tree structure of organized story files.
 */
export async function displayStoryTree(
  logger: (message: string) => void,
): Promise<void> {
  const storiesDir = await findKyotoDir()

  try {
    const stories = await readStoryFilesRecursive(storiesDir)
    if (stories.length === 0) {
      return
    }

    const tree = buildTree(stories)
    
    // Convert to treeify format, skipping the root .kyoto node
    const treeifyObject: Record<string, any> = {}
    if (tree.children && tree.children.length > 0) {
      // Sort children: directories first, then files
      const sortedChildren = [...tree.children].sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })

      for (const child of sortedChildren) {
        if (child.type === 'directory') {
          treeifyObject[child.name] = convertToTreeifyFormat(child)
        } else {
          // File - use title if available, otherwise filename
          const displayName = child.title || child.name.replace(/\.json$/, '')
          treeifyObject[displayName] = null
        }
      }
    }

    logger(chalk.grey('\nOrganized structure:\n'))
    const treeOutput = treeify(treeifyObject, {
      joined: true,
      spacerNeighbour: '│   ',
      spacerNoNeighbour: '    ',
      keyNoNeighbour: '└── ',
      keyNeighbour: '├── ',
    })

    // Build a set of directory names for quick lookup
    const directoryNames = new Set<string>()
    function collectDirectoryNames(obj: Record<string, any>): void {
      for (const [key, value] of Object.entries(obj)) {
        if (value !== null && typeof value === 'object') {
          directoryNames.add(key)
          collectDirectoryNames(value)
        }
      }
    }
    collectDirectoryNames(treeifyObject)

    // Apply colors to the output by identifying directories vs files
    const lines = treeOutput.split('\n')
    const coloredLines = lines.map((line, index) => {
      // Match the tree prefix and the first word (key name)
      const match = line.match(/^([├└│ ]+)([^\s]+)(.*)$/)
      if (!match) return line

      const [, prefix, name, rest] = match

      // If it's a directory (has children in our tree), color it green
      if (directoryNames.has(name)) {
        return prefix + chalk.hex('#7ba179')(name) + rest
      }

      // Otherwise it's a file, color it white
      return prefix + chalk.white(name + rest)
    })

    logger(coloredLines.join('\n'))
    logger('')
  } catch {
    // Silently fail if we can't read the tree
  }
}

