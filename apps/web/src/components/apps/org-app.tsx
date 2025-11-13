import { AppProvider } from '@/components/providers/app-provider'

import { OrgRepoBySlugLoader } from './org-repo-by-slug-loader'

export function OrgApp({ orgName }: { orgName: string }) {
  return (
    <AppProvider>
      <OrgRepoBySlugLoader orgName={orgName} />
    </AppProvider>
  )
}
