import { AppProvider } from '@/components/providers/app-provider'

import { SetupPage } from './SetupPage'

interface SetupPageWrapperProps {
  installationId?: number
}

export function SetupPageWrapper({ installationId }: SetupPageWrapperProps) {
  return (
    <AppProvider>
      <SetupPage installationId={installationId} />
    </AppProvider>
  )
}
