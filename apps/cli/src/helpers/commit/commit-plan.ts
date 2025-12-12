import { z } from 'zod'

const CommitPlanStepSchema = z.object({
  order: z.number().int().positive(),
  commitMessage: z.string().min(1),
  files: z.array(z.string().min(1)),
  reasoning: z.string().optional(),
})

export const CommitPlanSchema = z.object({
  version: z.literal(1),
  createdAt: z.string().datetime(),
  steps: z.array(CommitPlanStepSchema),
})

export type CommitPlan = z.infer<typeof CommitPlanSchema>
