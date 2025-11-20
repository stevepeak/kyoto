import { task, logger } from '@trigger.dev/sdk'
import dedent from 'dedent'
import { createTwoFilesPatch } from 'diff'

import { agents, generateText } from '@app/agents'
import {
  storyChangeClueResultSchema,
  storyChangeDiscoveryResultSchema,
  type ChangedStoryInsight,
  type RawStoryInput,
  type StoryChangeClueResult,
  type StoryChangeDiscoveryResult,
  type StoryDiffFile,
} from '@app/schemas'
import { parseEnv } from '@app/config'
import { setupDb } from '@app/db'

import { createDaytonaSandbox } from '../helpers/daytona'
import { getTelemetryTracer } from '@/telemetry'
import { findRepoByOwnerAndName } from './github/shared/db'
import { getOctokitClient } from '../helpers/github'

interface DiscoverStoryChangesPayload {
  repoSlug: string
  before: string
  after: string
  storyCount?: number
}

type GithubDiffFile = {
  filename: string
  status?: string
  additions?: number
  deletions?: number
  patch?: string | null
}

type ExistingStoryRecord = {
  id: string
  name: string | null
  story: string | null
}

const MAX_DIFF_TEXT_LENGTH = 20_000
const MAX_PATCH_LENGTH = 8_000
const MAX_EXISTING_STORIES = 50
const SIMILARITY_THRESHOLD = 0.45

export const discoverStoryChangesTask = task({
  id: 'discover-story-changes',
  run: async (
    payload: DiscoverStoryChangesPayload,
  ): Promise<StoryChangeDiscoveryResult> => {
    const env = parseEnv()
    const db = setupDb(env.DATABASE_URL)

    logger.info('🚀 Starting commit-driven story discovery', payload)

    try {
      const [ownerLogin, repoName] = payload.repoSlug.split('/')
      if (!ownerLogin || !repoName) {
        throw new Error(
          `Invalid repo slug "${payload.repoSlug}". Expected format "owner/repo".`,
        )
      }

      const repoRecord = await findRepoByOwnerAndName(db, {
        ownerLogin,
        repoName,
      })

      if (!repoRecord || !repoRecord.enabled) {
        throw new Error(
          `Repository ${payload.repoSlug} is not installed or is disabled.`,
        )
      }

      const commitRange = {
        repoSlug: payload.repoSlug,
        before: payload.before,
        after: payload.after,
      }

      let comparison
      const octokitClient = await getOctokitClient(repoRecord.repoId)

      try {
        comparison =
          await octokitClient.octokit.rest.repos.compareCommitsWithBasehead({
            owner: ownerLogin,
            repo: repoName,
            basehead: `${payload.before}...${payload.after}`,
          })
      } catch (error) {
        logger.error('❌ Failed to fetch commit comparison', {
          repoSlug: payload.repoSlug,
          commitRange,
          error,
        })
        throw error
      }

      const files = (comparison.data.files ?? []) as GithubDiffFile[]
      const commitMessages = extractCommitMessages(
        comparison.data.commits ?? [],
      )

      logger.info('📦 Retrieved commit comparison', {
        repoSlug: payload.repoSlug,
        filesAnalyzed: files.length,
        commitMessageCount: commitMessages.length,
      })

      const tsFiles = files.filter((file) => isTypescriptFile(file.filename))
      const diffSummary = buildDiffSummary(tsFiles, MAX_DIFF_TEXT_LENGTH)
      const sanitizedFiles = sanitizeDiffFiles(tsFiles, MAX_PATCH_LENGTH)

      if (tsFiles.length === 0) {
        logger.info('🔕 No TypeScript files changed. Skipping story discovery.', {
          repoSlug: payload.repoSlug,
        })

        return storyChangeDiscoveryResultSchema.parse({
          commitRange,
          commitMessages,
          diff: {
            filesAnalyzed: files.length,
            tsFiles: sanitizedFiles,
            diffText: diffSummary.text,
            truncated: diffSummary.truncated,
          },
          clues: [],
          changedStories: [],
          newStories: [],
        })
      }

      logger.info('🧮 Filtered TypeScript changes', {
        repoSlug: payload.repoSlug,
        tsFileCount: tsFiles.length,
        diffTruncated: diffSummary.truncated,
      })

      const clueResult = await analyzeFeatureClues({
        diffText: diffSummary.text,
        commitMessages,
      })

      logger.info('🕵️ Clue analysis completed', {
        repoSlug: payload.repoSlug,
        hasClues: clueResult.hasClues,
        clueCount: clueResult.clues.length,
      })

      if (!clueResult.hasClues || clueResult.clues.length === 0) {
        logger.info('🛑 No actionable clues detected. Returning diff summary.', {
          repoSlug: payload.repoSlug,
        })

        return storyChangeDiscoveryResultSchema.parse({
          commitRange,
          commitMessages,
          diff: {
            filesAnalyzed: files.length,
            tsFiles: sanitizedFiles,
            diffText: diffSummary.text,
            truncated: diffSummary.truncated,
          },
          clues: clueResult.clues,
          changedStories: [],
          newStories: [],
        })
      }

      const existingStories = await db
        .selectFrom('stories')
        .select(['id', 'name', 'story'])
        .where('repoId', '=', repoRecord.repoId)
        .where('state', '!=', 'archived')
        .orderBy('updatedAt', 'desc')
        .limit(MAX_EXISTING_STORIES)
        .execute()

      logger.info('📚 Loaded existing stories for comparison', {
        repoSlug: payload.repoSlug,
        storyCount: existingStories.length,
      })

      const sandbox = await createDaytonaSandbox({ repoId: repoRecord.repoId })

      let discoveryResult: RawStoryInput[] = []
      try {
        const storyCount =
          payload.storyCount ??
          Math.min(Math.max(clueResult.clues.length, 3), 6)

        logger.info('🤖 Running story discovery agent', {
          repoSlug: payload.repoSlug,
          storyCount,
        })

        const agentResult = await agents.discovery.run({
          repo: {
            id: repoRecord.repoId,
            slug: payload.repoSlug,
          },
          options: {
            daytonaSandboxId: sandbox.id,
            storyCount,
            telemetryTracer: getTelemetryTracer(),
            model: agents.discovery.options.model,
            existingStoryTitles: existingStories
              .map((story) => story.name)
              .filter((title): title is string => Boolean(title)),
            context: {
              mode: 'commit_diff',
              commitRange: {
                before: payload.before,
                after: payload.after,
              },
              commitMessages,
              clues: clueResult.clues.map((clue) => clue.summary),
              diffSummary: diffSummary.text,
            },
          },
        })

        discoveryResult = agentResult.stories
      } finally {
        await sandbox.delete()
      }

      logger.info('🧩 Story discovery finished', {
        repoSlug: payload.repoSlug,
        discoveredStories: discoveryResult.length,
      })

      const { changedStories, newStories } = classifyStories(
        discoveryResult,
        existingStories,
      )

      logger.info('📝 Story classification completed', {
        repoSlug: payload.repoSlug,
        changedStoryCount: changedStories.length,
        newStoryCount: newStories.length,
      })

      const result = storyChangeDiscoveryResultSchema.parse({
        commitRange,
        commitMessages,
        diff: {
          filesAnalyzed: files.length,
          tsFiles: sanitizedFiles,
          diffText: diffSummary.text,
          truncated: diffSummary.truncated,
        },
        clues: clueResult.clues,
        changedStories,
        newStories,
      })

      return result
    } finally {
      await db.destroy()
    }
  },
})

function isTypescriptFile(filename: string): boolean {
  return /\.(?:cts|mts|tsx|ts)$/i.test(filename)
}

function buildDiffSummary(
  files: GithubDiffFile[],
  maxLength: number,
): { text: string; truncated: boolean } {
  const chunks: string[] = []
  let totalLength = 0
  let truncated = false

  for (const file of files) {
    const patch =
      file.patch && file.patch.length > 0
        ? file.patch
        : '[Patch unavailable from GitHub API]'

    const chunk = dedent`
      diff --git a/${file.filename} b/${file.filename}
      status: ${file.status ?? 'modified'} (+${file.additions ?? 0}/-${
        file.deletions ?? 0
      })
      ${patch}
    `

    if (totalLength + chunk.length > maxLength) {
      const remaining = Math.max(maxLength - totalLength, 0)
      chunks.push(chunk.slice(0, remaining))
      truncated = true
      break
    }

    chunks.push(chunk)
    totalLength += chunk.length
  }

  return {
    text: chunks.join('\n\n'),
    truncated,
  }
}

function sanitizeDiffFiles(
  files: GithubDiffFile[],
  maxPatchLength: number,
): StoryDiffFile[] {
  return files.map((file) => {
    const patch =
      file.patch && file.patch.length > maxPatchLength
        ? `${file.patch.slice(0, maxPatchLength)}\n...[truncated]`
        : file.patch ?? undefined

    return {
      filename: file.filename,
      status: file.status ?? 'modified',
      additions: file.additions ?? 0,
      deletions: file.deletions ?? 0,
      patch,
    }
  })
}

async function analyzeFeatureClues({
  diffText,
  commitMessages,
}: {
  diffText: string
  commitMessages: string[]
}): Promise<StoryChangeClueResult> {
  const schemaDescription = `{
  "hasClues": boolean,
  "clues": [
    {
      "summary": string,
      "impactedAreas"?: string[],
      "confidence"?: number (0-1)
    }
  ]
}`

  const displayedMessages = commitMessages.slice(0, 10)
  const commitMessagesSection =
    displayedMessages.length > 0
      ? `${displayedMessages
          .map((msg, idx) => `${idx + 1}. ${msg}`)
          .join('\n')}${
          commitMessages.length > displayedMessages.length
            ? '\n... (truncated)'
            : ''
        }`
      : 'None'

  const prompt = dedent`
    You are analyzing a Git commit range to determine whether there are potential user-facing feature changes.

    Review the commit messages and diff excerpt, then respond with JSON that matches this schema:
    ${schemaDescription}

    - "hasClues" must be true only if there appears to be end-user functionality changes.
    - Each clue summary should be concise (max 200 characters).

    Commit messages:
    ${commitMessagesSection}

    Diff excerpt:
    ${diffText}
  `

  const raw = await generateText({
    prompt,
    modelId: 'gpt-4o-mini',
  })

  const parsed = storyChangeClueResultSchema.safeParse(safeJsonParse(raw))

  if (!parsed.success) {
    logger.error('Failed to parse clue analysis output', {
      raw,
      issues: parsed.error.issues,
    })
    throw parsed.error
  }

  return parsed.data
}

function classifyStories(
  discoveredStories: RawStoryInput[],
  existingStories: ExistingStoryRecord[],
): {
  changedStories: ChangedStoryInsight[]
  newStories: RawStoryInput[]
} {
  if (existingStories.length === 0) {
    return {
      changedStories: [],
      newStories: discoveredStories,
    }
  }

  const matchedStoryIds = new Set<string>()
  const changedStories: ChangedStoryInsight[] = []
  const newStories: RawStoryInput[] = []

  for (const candidate of discoveredStories) {
    const bestMatch = existingStories.reduce<{
      story: ExistingStoryRecord
      score: number
    } | null>((currentBest, story) => {
      if (matchedStoryIds.has(story.id)) {
        return currentBest
      }

      const score = Math.max(
        jaccardSimilarity(candidate.title ?? '', story.name ?? ''),
        jaccardSimilarity(candidate.text, story.story ?? ''),
      )

      if (!currentBest || score > currentBest.score) {
        return { story, score }
      }

      return currentBest
    }, null)

    if (bestMatch && bestMatch.score >= SIMILARITY_THRESHOLD) {
      matchedStoryIds.add(bestMatch.story.id)
      const existingTitle = bestMatch.story.name ?? 'Untitled story'
      const existingText = bestMatch.story.story ?? ''
      const diffPatch = createTwoFilesPatch(
        `existing-${bestMatch.story.name ?? bestMatch.story.id}`,
        `proposed-${candidate.title ?? 'candidate'}`,
        existingText,
        candidate.text,
      )

      changedStories.push({
        storyId: bestMatch.story.id,
        title: existingTitle,
        currentText: existingText,
        proposedText: candidate.text,
        similarityScore: Number(bestMatch.score.toFixed(3)),
        reasoning: `High textual similarity (${bestMatch.score.toFixed(2)}) between the proposed story and "${existingTitle}". Review and update the existing story.`,
        storyDiff:
          diffPatch.length > MAX_PATCH_LENGTH
            ? `${diffPatch.slice(0, MAX_PATCH_LENGTH)}\n...[truncated]`
            : diffPatch,
      })
    } else {
      newStories.push(candidate)
    }
  }

  return { changedStories, newStories }
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\d\sa-z]/g, ' ')
      .split(/\s+/)
      .filter(Boolean),
  )
}

function jaccardSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a)
  const tokensB = tokenize(b)

  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0
  }

  let intersection = 0
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersection += 1
    }
  }

  const union = tokensA.size + tokensB.size - intersection
  return union === 0 ? 0 : intersection / union
}

function extractCommitMessages(
  commits: Array<{ commit?: { message?: string | null } }>,
): string[] {
  return commits
    .map((commit) => commit.commit?.message?.trim())
    .filter((message): message is string => Boolean(message))
}

function safeJsonParse(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No JSON object found in model response')
  }

  const jsonText = cleaned.slice(firstBrace, lastBrace + 1)
  return JSON.parse(jsonText)
}
