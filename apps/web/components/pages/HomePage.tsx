import { OrgListApp } from '@/components/features/orgs/org-list'
import { AppProvider } from '@/components/providers/app-provider'

export function HomePage() {
  return (
    <AppProvider>
      <OrgListApp />
    </AppProvider>
  )
}
