/*
import { tool } from 'ai'
import { z } from 'zod'

export const exampleToolInputSchema = z.object({
  example: z.string().min(1).max(8_000).describe('Example to test'),
})

export function createExampleTool(ctx: any) {
  return tool({
    name: 'exampleTool',
    description: 'Test an example',
    inputSchema: exampleToolInputSchema,
    execute: async () => {
      return 'Hello World'
    },
  })
}
*/
