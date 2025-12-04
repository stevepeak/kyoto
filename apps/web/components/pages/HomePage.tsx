import { AppProvider } from '@/components/providers/app-provider'

import { OrgListApp } from '@/components/features/orgs/org-list'

export function HomePage() {
  return (
    <AppProvider>
      <OrgListApp />
    </AppProvider>
  )
}
