import { type VibeCheckScope } from '@app/types'
import { type Tracer } from '@opentelemetry/api'
import { type LanguageModel } from 'ai'

export type AnalyzeAgentOptions = {
  scope: VibeCheckScope
  options: {
    maxSteps?: number
    model: LanguageModel
    telemetryTracer?: Tracer
    progress?: (message: string) => void
    github?: {
      owner: string
      repo: string
      sha: string
      token: string
    }
  }
}
