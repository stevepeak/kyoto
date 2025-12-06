import { Experimental_Agent as Agent, stepCountIs } from 'ai'
import type { LanguageModel } from 'ai'
import { readLocalFile, createLocalMoveFileTool } from '@app/shell'
import type { StoryFile } from './story-file-reader.js'
import type { HierarchyOutput } from './hierarchy-agent.js'

// ============================================================================
// File Placement Agent
// ============================================================================

function buildFilePlacementInstructions(hierarchy: HierarchyOutput): string {
  const hierarchyDescription = hierarchy.hierarchy
    .map((dir) => `- ${dir.path}: ${dir.description}`)
    .join('\n')

  return `You are an expert at categorizing and organizing files.

# Objective
Review the provided story file and move it to the best location within the established hierarchy.

# Available Directories
${hierarchyDescription}

# Guidelines
1. Review the story file's title and behavior
2. Match it to the most appropriate directory from the hierarchy
3. Consider the story's domain, user journey, and technical area
4. If no directory perfectly fits, choose the closest match

# CRITICAL REQUIREMENT
You MUST call the moveFile tool to move the file. This is mandatory - you cannot skip this step.

# Tool Available
- moveFile: Move files to their target location (MANDATORY - you must use this)

# Path Format
When calling moveFile:
- Use paths relative to current working directory
- Source: ".kyoto/filename.json" (the current file location)
- Target: ".kyoto/directory-path/filename.json" (where it should go)

# Output
After moving the file, provide a plain text explanation of why you chose that folder location.`
}

interface DetermineFilePlacementOptions {
  model: LanguageModel
  storyFile: StoryFile
  hierarchy: HierarchyOutput
  onProgress?: (message: string) => void
  ora?: Parameters<typeof createLocalMoveFileTool>[0]
}

export async function determineFilePlacement(
  options: DetermineFilePlacementOptions,
): Promise<string> {
  const { model, storyFile, hierarchy, onProgress, ora } = options

  const agent = new Agent({
    model,
    system: buildFilePlacementInstructions(hierarchy),
    tools: {
      moveFile: createLocalMoveFileTool(ora),
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'file-placement-determiner',
      metadata: {
        filename: storyFile.filename,
      },
    },
    stopWhen: stepCountIs(20),
    onStepFinish: (step) => {
      if (step.reasoningText) {
        onProgress?.(step.reasoningText)
      }
    },
  })

  // Read the story file content for the agent
  const storyContent = await readLocalFile(storyFile.path)

  const prompt = `Move this story file to the best location within the hierarchy.

Current file path: ${storyFile.path}
Filename: ${storyFile.filename}
Title: ${storyFile.story.title}
Behavior: ${storyFile.story.behavior}

Story Content:
${storyContent}

MANDATORY: You MUST call the moveFile tool to move the file from "${storyFile.path}" to the appropriate location in the hierarchy. The target path should be relative to the current working directory (e.g., ".kyoto/users/preference/${storyFile.filename}").

After moving the file, explain in plain text why you chose that folder location.`

  try {
    const result = await agent.generate({ prompt })

    // Return the text response as the reasoning
    const reasoning = result.text || 'File moved to appropriate location'
    return reasoning
  } catch (error) {
    if (error instanceof Error) {
      onProgress?.(`❌ Error: ${error.message}`)
    }
    throw error
  }
}
