import { z } from 'zod'

const _createLinearIssueInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  teamId: z.string().min(1, 'Team ID is required'),
  labelIds: z.array(z.string()).optional(),
  assigneeId: z.string().optional(),
})

export type CreateLinearIssueInput = z.infer<
  typeof _createLinearIssueInputSchema
>

export interface CreateLinearIssueResult {
  success: boolean
  issueId?: string
  issueUrl?: string
  error?: string
}

const _createLinearCustomerInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional(),
  domains: z.array(z.string()).optional(),
})

export type CreateLinearCustomerInput = z.infer<
  typeof _createLinearCustomerInputSchema
>

export interface CreateLinearCustomerResult {
  success: boolean
  customerId?: string
  error?: string
}

const _createLinearCustomerRequestInputSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  issueId: z.string().min(1, 'Issue ID is required'),
  body: z.string().min(1, 'Body is required'),
  priority: z.number().int().min(0).max(2).default(1),
})

export type CreateLinearCustomerRequestInput = z.infer<
  typeof _createLinearCustomerRequestInputSchema
>

export interface CreateLinearCustomerRequestResult {
  success: boolean
  customerRequestId?: string
  error?: string
}

export interface LinearTeam {
  id: string
  name: string
  key: string
}

export interface GetLinearTeamsResult {
  success: boolean
  teams?: LinearTeam[]
  error?: string
}
