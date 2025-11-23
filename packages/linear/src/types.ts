import { z } from 'zod'

export const createLinearIssueInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  teamId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  assigneeId: z.string().optional(),
})

export type CreateLinearIssueInput = z.infer<typeof createLinearIssueInputSchema>

export interface CreateLinearIssueResult {
  success: boolean
  issueId?: string
  issueUrl?: string
  error?: string
}

