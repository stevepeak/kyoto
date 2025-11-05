import { AppProvider } from '@/components/providers/app-provider'

import { OrgRepoDashboardLoader } from './org-repo-dashboard-loader'

export function HomeApp() {
  return (
    <AppProvider>
      <OrgRepoDashboardLoader />
    </AppProvider>
  )
}


