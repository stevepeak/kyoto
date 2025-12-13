import { z } from 'zod'

export const cliSessionResponseSchema = z.object({
  token: z.string(),
  userId: z.string(),
  login: z.string(),
  openrouterApiKey: z.string(),
  createdAtMs: z.number(),
})

export type CliSessionResponse = z.infer<typeof cliSessionResponseSchema>
