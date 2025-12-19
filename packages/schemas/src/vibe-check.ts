import { z } from 'zod'

// The scope that was checked - matches VibeCheckScope from @app/types
export const vibeCheckScopeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('commits'), commits: z.array(z.string()) }),
  z.object({ type: z.literal('commit'), commit: z.string() }),
  z.object({ type: z.literal('staged') }),
  z.object({ type: z.literal('unstaged') }),
  z.object({ type: z.literal('changes') }),
  z.object({ type: z.literal('paths'), paths: z.array(z.string()) }),
  z.object({
    type: z.literal('file-lines'),
    changes: z.array(z.object({ file: z.string(), lines: z.string() })),
  }),
])

// Individual finding within an agent's results
export const vibeCheckFindingSchema = z.object({
  message: z.string(),
  path: z.string().optional(),
  suggestion: z.string().optional(),
  severity: z.enum(['info', 'warn', 'bug', 'error', 'high']),
})

// Agent result with all its findings
export const vibeCheckAgentResultSchema = z.object({
  id: z.string(), // e.g., "bug-detection"
  label: z.string(), // e.g., "Bug Detection"
  status: z.enum(['success', 'warn', 'fail']),
  findings: z.array(vibeCheckFindingSchema),
})

// Root schema for check.json
export const vibeCheckFileSchema = z.object({
  // Schema version for future compatibility
  version: z.literal(1),
  // ISO 8601 timestamp of when check ran
  timestamp: z.string(),

  // Git context
  git: z.object({
    branch: z.string().optional(),
    headCommit: z.string().optional(), // Current HEAD SHA
    scope: vibeCheckScopeSchema,
  }),

  // Results grouped by agent (category)
  agents: z.array(vibeCheckAgentResultSchema),
})

export type VibeCheckFile = z.infer<typeof vibeCheckFileSchema>
export type VibeCheckFileScope = z.infer<typeof vibeCheckScopeSchema>
export type VibeCheckAgentResult = z.infer<typeof vibeCheckAgentResultSchema>
export type VibeCheckFileFinding = z.infer<typeof vibeCheckFindingSchema>
