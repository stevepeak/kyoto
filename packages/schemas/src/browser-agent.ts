import { z } from 'zod'

// ============================================================================
// Browser Agent Observation Types
// ============================================================================

export const browserAgentObservationSchema = z.object({
  action: z.string(),
  result: z.string(),
  timestamp: z.string(),
})

export type BrowserAgentObservation = z.infer<
  typeof browserAgentObservationSchema
>

export const browserAgentOutputSchema = z.object({
  observations: z.array(browserAgentObservationSchema),
  summary: z.string(),
  success: z.boolean(),
})

export type BrowserAgentOutput = z.infer<typeof browserAgentOutputSchema>

// ============================================================================
// Story Types
// ============================================================================

export const browserAgentStorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  instructions: z.string(),
  scheduleText: z.string().nullable(),
  cronSchedule: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type BrowserAgentStory = z.infer<typeof browserAgentStorySchema>

// ============================================================================
// Run Types
// ============================================================================

export const browserAgentRunSchema = z.object({
  id: z.string().uuid(),
  storyId: z.string().uuid(),
  status: z.string(),
  sessionId: z.string().nullable(),
  observations: browserAgentOutputSchema.nullable(),
  error: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  triggerRunId: z.string().nullable(),
  triggerPublicAccessToken: z.string().nullable(),
})

export type BrowserAgentRun = z.infer<typeof browserAgentRunSchema>

// ============================================================================
// Trigger Types
// ============================================================================

export const triggerHandleSchema = z.object({
  runId: z.string(),
  publicAccessToken: z.string(),
})

export type TriggerHandle = z.infer<typeof triggerHandleSchema>

export const activeRunSchema = z.object({
  id: z.string().uuid(),
  triggerHandle: z.object({
    id: z.string(),
    publicAccessToken: z.string(),
  }),
})

export type ActiveRun = z.infer<typeof activeRunSchema>

// ============================================================================
// Run Status Types
// ============================================================================

export type RunDisplayStatus = {
  status: 'passed' | 'failed' | 'running' | 'pending' | string
  label: string
}
