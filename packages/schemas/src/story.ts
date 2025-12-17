import { z } from 'zod'

// ============================================================================
// Browser Agent Observation Types
// ============================================================================

export const storyTestObservationSchema = z.object({
  action: z.string(),
  result: z.string(),
  timestamp: z.string(),
})

export type StoryTestObservation = z.infer<typeof storyTestObservationSchema>

export const storyTestOutputSchema = z.object({
  observations: z.array(storyTestObservationSchema),
  summary: z.string(),
  success: z.boolean(),
})

export type StoryTestOutput = z.infer<typeof storyTestOutputSchema>

// ============================================================================
// Story Types
// ============================================================================

export const storyTestTypeSchema = z.enum(['browser', 'vm'])

export type StoryTestType = z.infer<typeof storyTestTypeSchema>

export const storySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  instructions: z.string(),
  testType: storyTestTypeSchema,
  scheduleText: z.string().nullable(),
  cronSchedule: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Story = z.infer<typeof storySchema>

// ============================================================================
// Run Types
// ============================================================================

export const storyRunSchema = z.object({
  id: z.string().uuid(),
  storyId: z.string().uuid(),
  status: z.string(),
  sessionId: z.string().nullable(),
  observations: storyTestOutputSchema.nullable(),
  error: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  triggerRunId: z.string().nullable(),
  triggerPublicAccessToken: z.string().nullable(),
})

export type StoryRun = z.infer<typeof storyRunSchema>

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
