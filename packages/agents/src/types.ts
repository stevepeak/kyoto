import { type VibeCheckContext } from '@app/types'
import { type Tracer } from '@opentelemetry/api'

export type AnalyzeAgentOptions = {
  context: VibeCheckContext
  options?: {
    maxSteps?: number
    telemetryTracer?: Tracer
    progress?: (message: string) => void
  }
}
