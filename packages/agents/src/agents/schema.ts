import type { Tracer } from '@opentelemetry/api'
import type { DecompositionAgentResult } from './v3/story-decomposition'

export type evaluationAgentOptions = {
  repo: {
    id: string
    slug: string
  }
  story: {
    id: string
    name: string
    text: string
    decomposition: DecompositionAgentResult
  }
  options?: {
    /** Maximum number of steps to take */
    maxSteps?: number
    /** Model ID to use like "gpt-5-mini" */
    modelId?: string
    /** Daytona Sandbox ID to use */
    daytonaSandboxId?: string
    telemetryTracer?: Tracer
  }
}
