import { agents, runStoryCheckAgent } from '@app/agents'
import { type CompositionAgentOutput, type DiscoveredStory } from '@app/schemas'
import { findGitRoot, getGitHubInfo, writeLocalFile } from '@app/shell'
import { type LanguageModel } from 'ai'
import chalk from 'chalk'
import { join } from 'node:path'
import ora from 'ora'

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
  logger: (message: string) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  telemetryTracer?: any
}

interface ProcessedStory {
  story: DiscoveredStory
  filePath: string
  embedding: number[]
}

/**
 * Check if a story already exists using semantic search
 */
async function checkStoryExists(
  story: DiscoveredStory,
  options: {
    model: LanguageModel
    logger?: (message: string) => void
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
    logger?: (message: string) => void
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
    logger?: (message: string) => void
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
 * Write story JSON to file (without embeddings)
 */
async function writeStoryFile(
  story: DiscoveredStory,
  filePath: string,
  composition?: CompositionAgentOutput,
): Promise<void> {
  // Create story object without embeddings
  const storyToWrite = {
    title: story.title,
    behavior: story.behavior,
    dependencies: story.dependencies,
    acceptanceCriteria: story.acceptanceCriteria,
    assumptions: story.assumptions,
    codeReferences: story.codeReferences,
    ...(composition && { composition }),
  }

  const content = JSON.stringify(storyToWrite, null, 2)
  await writeLocalFile(filePath, content)
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

  const processedStories: ProcessedStory[] = []

  for (const [index, candidate] of candidates.entries()) {
    logger(
      chalk.grey(`Processing ${index + 1}/${candidates.length} behavior: `) +
        chalk.hex('#7ba179')(`${candidate.title}`),
    )

    // Step 1: Check if story already exists
    const dedupeSpinner = ora({
      text: chalk.hex('#7b301f')(`Dedupe Agent: `) + chalk.grey('Starting...'),
      spinner: 'squareCorners',
      color: 'red',
      indent: 2,
    }).start()

    try {
      const exists = await checkStoryExists(candidate, {
        model,
        logger: (msg: string) => {
          dedupeSpinner.text =
            chalk.hex('#7b301f')(`Dedupe Agent: `) + chalk.grey(msg)
        },
        telemetryTracer,
      })

      dedupeSpinner.succeed(
        exists
          ? chalk.hex('#7b301f')(`Dedupe Agent: `) +
              chalk.grey('skipping, story already exists with behavior')
          : chalk.hex('#7b301f')(`Dedupe Agent: `) +
              chalk.grey('no story found'),
      )

      if (exists) {
        continue
      }

      // Step 2: Enrich the story
      const enrichSpinner = ora({
        text:
          chalk.hex('#7b301f')(`Enrich Agent: `) + chalk.grey('Starting...'),
        spinner: 'squareCorners',
        color: 'red',
        indent: 2,
      }).start()

      const enrichedStory = await enrichStory(candidate, {
        model,
        logger: (msg: string) => {
          enrichSpinner.text =
            chalk.hex('#7b301f')(`Enrich Agent: `) + chalk.grey(msg)
        },
        telemetryTracer,
      })

      enrichSpinner.succeed(
        chalk.hex('#7b301f')(`Enrich Agent: `) + chalk.grey('enriched'),
      )

      // Step 3: Run composition agent
      const compositionSpinner = ora({
        text:
          chalk.hex('#7b301f')(`Composition Agent: `) +
          chalk.grey('Starting...'),
        spinner: 'squareCorners',
        color: 'red',
        indent: 2,
      }).start()

      const composition = await composeStory(enrichedStory, {
        model,
        logger: (msg: string) => {
          compositionSpinner.text =
            chalk.hex('#7b301f')(`Composition Agent: `) + chalk.grey(msg)
        },
        telemetryTracer,
      })

      compositionSpinner.succeed(
        chalk.hex('#7b301f')(`Composition Agent: `) +
          chalk.grey(`${composition.steps.length} steps composed`),
      )

      // Step 4-6: Write story file, generate embedding, and save to index
      const saveSpinner = ora({
        text:
          chalk.hex('#7b301f')(`Saving: `) +
          chalk.grey('Writing story file...'),
        spinner: 'squareCorners',
        color: 'red',
        indent: 2,
      }).start()

      const filename = `${generateStoryFilename(enrichedStory.title)}.json`
      const { stories: storiesDir } = await pwdKyoto()
      const filePath = join(storiesDir, filename)
      await writeStoryFile(enrichedStory, filePath, composition)

      // Generate embedding
      saveSpinner.text =
        chalk.hex('#7b301f')(`Saving: `) + chalk.grey('Generating embedding...')
      const embedding = await generateStoryEmbedding(enrichedStory)

      // Save embedding to vectra index
      saveSpinner.text =
        chalk.hex('#7b301f')(`Saving: `) + chalk.grey('Saving to index...')
      await saveStoryEmbeddingToIndex(filePath, enrichedStory, embedding)

      saveSpinner.succeed(
        chalk.hex('#7b301f')(`Saving: `) + chalk.grey('saved'),
      )

      processedStories.push({
        story: enrichedStory,
        filePath,
        embedding,
      })

      logger('')
    } catch (error) {
      dedupeSpinner.fail(
        chalk.hex('#7b301f')(`Dedupe Agent: `) +
          chalk.grey(
            `failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ),
      )
      // Continue processing other stories even if one fails
    }
  }

  return processedStories
}

// Export individual functions for testing
export {
  checkStoryExists,
  enrichStory,
  generateStoryEmbedding,
  saveStoryEmbeddingToIndex,
  writeStoryFile,
}
