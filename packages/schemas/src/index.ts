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
// BROWSER AGENT SCHEMAS (Browser agent story/run types)
// ============================================================================

export {
  type ActiveRun,
  activeRunSchema,
  type RunDisplayStatus,
  type Story,
  type StoryRun,
  storyRunSchema,
  storySchema,
  type StoryTestObservation,
  storyTestObservationSchema,
  type StoryTestOutput,
  storyTestOutputSchema,
  type StoryTestType,
  storyTestTypeSchema,
  type TriggerHandle,
  triggerHandleSchema,
} from './story'

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

// ============================================================================
// WEBHOOK PAYLOAD SCHEMAS (Integration webhook contracts)
// ============================================================================

export {
  createSampleWebhookPayload,
  type WebhookConfig,
  webhookConfigSchema,
  type WebhookEvent,
  webhookEventSchema,
  type WebhookPayload,
  webhookPayloadSchema,
  type WebhookRun,
  webhookRunSchema,
  type WebhookStory,
  webhookStorySchema,
} from './webhook-payload'
