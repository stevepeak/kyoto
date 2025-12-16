/**
 * ============================================================================
 * SCHEMAS PACKAGE - MAIN EXPORTS
 * ============================================================================
 */

// ============================================================================
// AGENT TYPES (Agent-specific configuration types)
// ============================================================================

export { type Commit } from './agent-types'

// ============================================================================
// CLI SCHEMAS (CLI ↔ web shared contracts)
// ============================================================================

export { type CliSessionResponse, cliSessionResponseSchema } from './cli'

// ============================================================================
// VIBE CHECK SCHEMAS (CLI ↔ extension shared contracts)
// ============================================================================

export {
  type VibeCheckAgentResult,
  vibeCheckAgentResultSchema,
  type VibeCheckFile,
  type VibeCheckFileFinding,
  vibeCheckFileSchema,
  type VibeCheckFileScope,
  vibeCheckFindingSchema,
  vibeCheckScopeSchema,
} from './vibe-check'
