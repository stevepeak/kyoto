import { type BrowserbaseToolsContext } from '@app/browserbase'
import { type Tracer } from '@opentelemetry/api'
import { type LanguageModel } from 'ai'

export type AnalyzeBrowserAgentOptions = {
  /** The instructions describing what the browser agent should do */
  instructions: string
  /** The Browserbase tools context with stagehand and agent */
  browserContext: BrowserbaseToolsContext
  /** The AI model to use */
  model: LanguageModel
  /** Maximum number of steps the agent can take (default: 50) */
  maxSteps?: number
  /** Optional telemetry tracer */
  telemetryTracer?: Tracer
  /** Optional progress callback */
  onProgress?: (message: string) => void
}
