import { z } from 'zod'

import { rawStoryInputSchema } from './story-flow'

export const storyDiffFileSchema = z.object({
  filename: z.string(),
  status: z.string(),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  patch: z.string().optional(),
})

export const storyDiffSummarySchema = z.object({
  filesAnalyzed: z.number().int().nonnegative(),
  tsFiles: z.array(storyDiffFileSchema),
  diffText: z.string().optional(),
  truncated: z.boolean().optional(),
})

export const storyChangeClueSchema = z.object({
  summary: z.string(),
  impactedAreas: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
})

export const storyChangeClueResultSchema = z.object({
  hasClues: z.boolean(),
  clues: z.array(storyChangeClueSchema),
})

export const changedStoryInsightSchema = z.object({
  storyId: z.string(),
  title: z.string(),
  currentText: z.string(),
  proposedText: z.string(),
  similarityScore: z.number().min(0).max(1),
  reasoning: z.string(),
  storyDiff: z.string().optional(),
})

export const storyChangeDiscoveryResultSchema = z.object({
  commitRange: z.object({
    repoSlug: z.string(),
    before: z.string(),
    after: z.string(),
  }),
  commitMessages: z.array(z.string()),
  diff: storyDiffSummarySchema,
  clues: z.array(storyChangeClueSchema),
  changedStories: z.array(changedStoryInsightSchema),
  newStories: z.array(rawStoryInputSchema),
})

export type StoryDiffFile = z.infer<typeof storyDiffFileSchema>
export type StoryDiffSummary = z.infer<typeof storyDiffSummarySchema>
export type StoryChangeClue = z.infer<typeof storyChangeClueSchema>
export type StoryChangeClueResult = z.infer<typeof storyChangeClueResultSchema>
export type ChangedStoryInsight = z.infer<typeof changedStoryInsightSchema>
export type StoryChangeDiscoveryResult = z.infer<
  typeof storyChangeDiscoveryResultSchema
>
