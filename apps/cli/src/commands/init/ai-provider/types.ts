import { type Config } from '../../../helpers/config/get'
import { type Provider } from './constants'

export type Step =
  | 'check-existing'
  | 'confirm-change'
  | 'select-provider'
  | 'api-key'
  | 'saving'
  | 'done'

export type ComponentState = 'pending' | 'active' | 'completed'

export type AIProviderProps = {
  state: ComponentState
  onComplete: () => void
}

export type ConfirmChangeStepProps = {
  existingConfig: Config
  existingProviderLabel: string
  onConfirmChange: () => void
  onKeepExisting: () => void
  onError: (message: string) => void
}

export type SelectProviderStepProps = {
  onSelect: (provider: Provider) => void
}

export type ApiKeyStepProps = {
  providerLabel: string
  onSubmit: (apiKey: string) => void
  onError: (message: string) => void
}

export type CompletedStepProps = {
  model: string | undefined
  providerLabel: string
  logs: { key: string; content: React.ReactNode }[]
}
