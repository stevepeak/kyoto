import { AppProvider } from '@/components/providers/app-provider'

import { SetupSyncStatus } from './setup-sync-status'

interface SetupSyncStatusWrapperProps {
  pollIntervalMs?: number
  redirectOnCompletion?: boolean
}

export function SetupSyncStatusWrapper(props: SetupSyncStatusWrapperProps) {
  return (
    <AppProvider>
      <SetupSyncStatus {...props} />
    </AppProvider>
  )
}
