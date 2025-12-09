import { agents, runStoryCheckAgent } from '@app/agents'
import { type CompositionAgentOutput, type DiscoveredStory } from '@app/schemas'
import { findGitRoot, getGitHubInfo, writeLocalFile } from '@app/shell'
import { type LanguageModel } from 'ai'
import { join, relative } from 'node:path'

import { type Logger } from '../../types/logger'
import { pwdKyoto } from '../config/find-kyoto-dir'
import { generateEmbedding } from '../embeddings/generate-embedding'
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

interface ProcessCandidatesOptions {
  candidates: DiscoveredStory[]
  model: LanguageModel
  logger: Logger
  createSpinner?: (text: string) => SpinnerHandle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  telemetryTracer?: any
}

interface ProcessedStory {
  story: DiscoveredStory
  filePath: string
  embedding: number[]
}

interface SpinnerHandle {
  update: (text: string) => void
  succeed: (text?: string) => void
  fail: (text?: string) => void
  stop: () => void
}

function createNoopSpinner(_initialText: string): SpinnerHandle {
  return {
    update: () => {
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
    ((text: string) => {
      return createNoopSpinner(text)
    })

  const processedStories: ProcessedStory[] = []

  for (const [index, candidate] of candidates.entries()) {
    logger(
      `Processing ${index + 1}/${candidates.length} behavior: ${candidate.title}`,
      'grey',
    )

    // Step 1: Check if story already exists
    const dedupeSpinner = createSpinner('Dedupe Agent: Starting...')

    try {
      const exists = await checkStoryExists(candidate, {
        model,
        logger: (msg: string) => {
          dedupeSpinner.update(`Dedupe Agent: ${msg}`)
        },
        telemetryTracer,
      })

      dedupeSpinner.succeed(
        exists
          ? 'Dedupe Agent: skipping, story already exists with behavior'
          : 'Dedupe Agent: no story found',
      )

      if (exists) {
        continue
      }

      // Step 2: Enrich the story
      const enrichSpinner = createSpinner('Enrich Agent: Starting...')

      const enrichedStory = await enrichStory(candidate, {
        model,
        logger: (msg: string) => {
          enrichSpinner.update(`Enrich Agent: ${msg}`)
        },
        telemetryTracer,
      })

      enrichSpinner.succeed('Enrich Agent: enriched')

      // Step 3: Run composition agent
      const compositionSpinner = createSpinner('Composition Agent: Starting...')

      const composition = await composeStory(enrichedStory, {
        model,
        logger: (msg: string) => {
          compositionSpinner.update(`Composition Agent: ${msg}`)
        },
        telemetryTracer,
      })

      compositionSpinner.succeed(
        `Composition Agent: ${composition.steps.length} steps composed`,
      )

      // Step 4-6: Write story file, generate embedding, and save to index
      const saveSpinner = createSpinner('Saving: Writing story file...')

      const baseFilename = generateStoryFilename(enrichedStory.title)
      const filePath = await writeStoryFile(
        enrichedStory,
        baseFilename,
        composition,
      )

      // Generate embedding
      saveSpinner.update('Saving: Generating embedding...')
      const embedding = await generateStoryEmbedding(enrichedStory)

      // Save embedding to vectra index
      saveSpinner.update('Saving: Saving to index...')
      await saveStoryEmbeddingToIndex(filePath, enrichedStory, embedding)

      saveSpinner.succeed('Saving: saved')

      processedStories.push({
        story: enrichedStory,
        filePath,
        embedding,
      })

      logger('')
    } catch (error) {
      dedupeSpinner.fail(
        `Dedupe Agent: failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
      // Continue processing other stories even if one fails
    }
  }

  return processedStories
}

// Export individual functions for testing
