import { AppProvider } from '@/components/providers/app-provider'

import { OrgListApp } from './org-list-app'

export function HomeApp() {
  return (
    <AppProvider>
      <OrgListApp />
    </AppProvider>
  )
}
