import { z } from 'zod'

// Shared enums for agent coordination
const evaluationResultSchema = z.enum([
  'pass',
  'fail',
  'not-implemented',
  'blocked',
])

export type EvaluationResult = z.infer<typeof evaluationResultSchema>

const toolTraceSchema = z.object({
  summary: z.string().min(1),
  reasoning: z.array(z.string().min(1)).default([]),
  searchQueries: z.array(z.string().min(1)).default([]),
})

export type ToolTrace = z.infer<typeof toolTraceSchema>

const reviewerCodeSnippetSchema = z.object({
  path: z.string().min(1),
  start: z.number().int().min(0),
  end: z.number().int().min(0),
  content: z.string().min(1),
})

export type ReviewerCodeSnippet = z.infer<typeof reviewerCodeSnippetSchema>

export const stepReviewerOutputSchema = z.object({
  result: evaluationResultSchema,
  description: z.string().min(1),
  code: z.array(reviewerCodeSnippetSchema).default([]),
  trace: toolTraceSchema,
})

export type StepReviewerOutput = z.infer<typeof stepReviewerOutputSchema>

const storyStepSchema = z.object({
  id: z.string().min(1),
  index: z.number().int().min(0),
  description: z.string().min(1),
})

export type StoryStep = z.infer<typeof storyStepSchema>

export const storyDirectorOutputSchema = z.object({
  result: evaluationResultSchema,
  story: z.string().min(1),
  steps: z.array(stepReviewerOutputSchema),
  trace: toolTraceSchema,
})

export type StoryDirectorOutput = z.infer<typeof storyDirectorOutputSchema>

export const storyDirectorPlanSchema = z.object({
  story: z.string().min(1),
  steps: z.array(storyStepSchema).min(1),
  trace: toolTraceSchema,
})

export type StoryDirectorPlan = z.infer<typeof storyDirectorPlanSchema>

export const reviewerInputSchema = z.object({
  step: storyStepSchema,
  priorSteps: z.array(stepReviewerOutputSchema).default([]),
})

export type ReviewerInput = z.infer<typeof reviewerInputSchema>
