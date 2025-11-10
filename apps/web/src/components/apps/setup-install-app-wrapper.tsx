import { AppProvider } from '@/components/providers/app-provider'

import { SetupInstallApp } from './setup-install-app'

interface SetupInstallAppWrapperProps {
  installUrl: string
}

export function SetupInstallAppWrapper({
  installUrl,
}: SetupInstallAppWrapperProps) {
  return (
    <AppProvider>
      <SetupInstallApp installUrl={installUrl} />
    </AppProvider>
  )
}
