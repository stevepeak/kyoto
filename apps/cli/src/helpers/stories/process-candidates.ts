import { agents, runStoryCheckAgent } from '@app/agents'
import { type CompositionAgentOutput, type DiscoveredStory } from '@app/schemas'
import { findGitRoot, getGitHubInfo, writeLocalFile } from '@app/shell'
import { type LanguageModel } from 'ai'
import { Text } from 'ink'
import { join, relative } from 'node:path'
import React from 'react'

import { type Logger } from '../../types/logger'
import { pwdKyoto } from '../config/find-kyoto-dir'
import { generateEmbedding } from '../embeddings/generate-embedding'
import { type SpinnerHandle } from '../display/use-spinner'
import { createSearchStoriesTool } from '../tools/search-stories-tool'
import { saveStoryEmbedding } from './save-embedding'

/**
 * Generate a filename from a story title
 */
function generateStoryFilename(title: string): string {
  // Convert title to kebab-case and sanitize
  return title
    .toLowerCase()
    .replace(/[^\da-z]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) // Limit length
}

/**
 * Generate embedding text from a story
 */
function generateEmbeddingText(story: DiscoveredStory): string {
  const parts = [story.title, story.behavior, ...story.acceptanceCriteria]

  if (story.dependencies) {
    if (story.dependencies.entry) {
      parts.push(`Entry: ${story.dependencies.entry}`)
    }
    if (story.dependencies.exit) {
      parts.push(`Exit: ${story.dependencies.exit}`)
    }
    if (story.dependencies.prerequisites.length > 0) {
      parts.push(
        `Prerequisites: ${story.dependencies.prerequisites.join(', ')}`,
      )
    }
    if (story.dependencies.sideEffects.length > 0) {
      parts.push(`Side effects: ${story.dependencies.sideEffects.join(', ')}`)
    }
  }

  return parts.join('\n')
}

interface CreateSpinnerOptions {
  title: string
  progress: string
}

interface ProcessCandidatesOptions {
  candidates: DiscoveredStory[]
  model: LanguageModel
  logger: Logger
  createSpinner?: (options: CreateSpinnerOptions) => SpinnerHandle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  telemetryTracer?: any
}

interface ProcessedStory {
  story: DiscoveredStory
  filePath: string
  embedding: number[]
}

function createNoopSpinner(_options: CreateSpinnerOptions): SpinnerHandle {
  return {
    progress: () => {
      // noop
    },
    succeed: () => {
      // noop
    },
    fail: () => {
      // noop
    },
    stop: () => {
      // noop
    },
  }
}

/**
 * Check if a story already exists using semantic search
 */
async function checkStoryExists(
  story: DiscoveredStory,
  options: {
    model: LanguageModel
    logger?: Logger
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    telemetryTracer?: any
  },
): Promise<boolean> {
  const searchStoriesTool = createSearchStoriesTool({
    logger: options.logger,
  })

  const result = await runStoryCheckAgent({
    story,
    searchStoriesTool,
    options: {
      model: options.model,
      logger: options.logger,
      telemetryTracer: options.telemetryTracer,
    },
  })

  return result.found
}

/**
 * Enrich a story with additional context from the codebase
 */
async function enrichStory(
  story: DiscoveredStory,
  options: {
    model: LanguageModel
    logger?: Logger
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    telemetryTracer?: any
  },
): Promise<DiscoveredStory> {
  const result = await agents.storyEnrichment.run({
    story,
    options: {
      model: options.model,
      logger: options.logger,
      telemetryTracer: options.telemetryTracer,
    },
  })

  return result.story
}

/**
 * Run composition agent to break story into testable steps
 */
async function composeStory(
  story: DiscoveredStory,
  options: {
    model: LanguageModel
    logger?: Logger
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    telemetryTracer?: any
  },
): Promise<CompositionAgentOutput> {
  const gitRoot = await findGitRoot()
  const githubInfo = await getGitHubInfo(gitRoot)

  // Use GitHub info if available, otherwise use placeholder
  const repo = githubInfo
    ? {
        id: `${githubInfo.owner}/${githubInfo.repo}`,
        slug: `${githubInfo.owner}/${githubInfo.repo}`,
      }
    : {
        id: 'local',
        slug: 'local/local',
      }

  const result = await agents.composition.run({
    story,
    repo,
    options: {
      model: options.model,
      logger: options.logger,
      telemetryTracer: options.telemetryTracer,
    },
  })

  return result
}

/**
 * Generate embedding for a story
 */
async function generateStoryEmbedding(
  story: DiscoveredStory,
): Promise<number[]> {
  const text = generateEmbeddingText(story)
  return await generateEmbedding({ text })
}

/**
 * Write story to files:
 * - Behavior as markdown to .kyoto/stories/<name>.story.md
 * - Other details as JSON to .kyoto/artifacts/<name>.json
 *
 * @returns The path to the story markdown file (relative to git root)
 */
async function writeStoryFile(
  story: DiscoveredStory,
  baseFilename: string,
  composition?: CompositionAgentOutput,
): Promise<string> {
  const gitRoot = await findGitRoot()
  const { stories: storiesDir, artifacts: artifactsDir } =
    await pwdKyoto(gitRoot)

  // Write behavior as markdown to .kyoto/stories/<name>.story.md
  const storyMdPathAbsolute = join(storiesDir, `${baseFilename}.story.md`)
  const storyMdPathRelative = relative(gitRoot, storyMdPathAbsolute)
  const behaviorContent = story.behavior
  await writeLocalFile(storyMdPathRelative, behaviorContent)

  // Write other details as JSON to .kyoto/artifacts/<name>.json
  const artifactPathAbsolute = join(artifactsDir, `${baseFilename}.json`)
  const artifactPathRelative = relative(gitRoot, artifactPathAbsolute)
  const artifactData = {
    title: story.title,
    dependencies: story.dependencies,
    acceptanceCriteria: story.acceptanceCriteria,
    assumptions: story.assumptions,
    codeReferences: story.codeReferences,
    ...(composition && { composition }),
  }
  const artifactContent = JSON.stringify(artifactData, null, 2)
  await writeLocalFile(artifactPathRelative, artifactContent)

  return storyMdPathRelative
}

/**
 * Save embedding to vectra index
 */
async function saveStoryEmbeddingToIndex(
  filePath: string,
  story: DiscoveredStory,
  embedding: number[],
): Promise<void> {
  await saveStoryEmbedding({
    filePath,
    story,
    embedding,
  })
}

/**
 * Main orchestrator function to process discovered candidates
 */
export async function processDiscoveredCandidates(
  options: ProcessCandidatesOptions,
): Promise<ProcessedStory[]> {
  const { candidates, model, logger, telemetryTracer } = options
  const createSpinner =
    options.createSpinner ??
    ((options: CreateSpinnerOptions) => {
      return createNoopSpinner(options)
    })

  const processedStories: ProcessedStory[] = []

  for (const [index, candidate] of candidates.entries()) {
    logger(
      React.createElement(
        Text,
        { color: 'grey' },
        `Processing ${index + 1}/${candidates.length} behavior: ${candidate.title}`,
      ),
    )

    // Step 1: Check if story already exists
    const dedupeSpinner = createSpinner({
      title: 'Dedupe Agent',
      progress: 'Starting...',
    })

    try {
      const exists = await checkStoryExists(candidate, {
        model,
        logger: (msg) => {
          const text = typeof msg === 'string' ? msg : String(msg)
          dedupeSpinner.progress(text)
        },
        telemetryTracer,
      })

      dedupeSpinner.succeed(
        exists
          ? 'skipping, story already exists with behavior'
          : 'no story found',
      )

      if (exists) {
        continue
      }

      // Step 2: Enrich the story
      const enrichSpinner = createSpinner({
        title: 'Enrich Agent',
        progress: 'Starting...',
      })

      const enrichedStory = await enrichStory(candidate, {
        model,
        logger: (msg) => {
          const text = typeof msg === 'string' ? msg : String(msg)
          enrichSpinner.progress(text)
        },
        telemetryTracer,
      })

      enrichSpinner.succeed('enriched')

      // Step 3: Run composition agent
      const compositionSpinner = createSpinner({
        title: 'Composition Agent',
        progress: 'Starting...',
      })

      const composition = await composeStory(enrichedStory, {
        model,
        logger: (msg) => {
          const text = typeof msg === 'string' ? msg : String(msg)
          compositionSpinner.progress(text)
        },
        telemetryTracer,
      })

      compositionSpinner.succeed(`${composition.steps.length} steps composed`)

      // Step 4-6: Write story file, generate embedding, and save to index
      const saveSpinner = createSpinner({
        title: 'Saving',
        progress: 'Writing story file...',
      })

      const baseFilename = generateStoryFilename(enrichedStory.title)
      const filePath = await writeStoryFile(
        enrichedStory,
        baseFilename,
        composition,
      )

      // Generate embedding
      saveSpinner.progress('Generating embedding...')
      const embedding = await generateStoryEmbedding(enrichedStory)

      // Save embedding to vectra index
      saveSpinner.progress('Saving to index...')
      await saveStoryEmbeddingToIndex(filePath, enrichedStory, embedding)

      saveSpinner.succeed('saved')

      processedStories.push({
        story: enrichedStory,
        filePath,
        embedding,
      })

      logger('')
    } catch (error) {
      dedupeSpinner.fail(
        `failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
      // Continue processing other stories even if one fails
    }
  }

  return processedStories
}

// Export individual functions for testing
