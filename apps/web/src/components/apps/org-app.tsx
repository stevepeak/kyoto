import { AppProvider } from '@/components/providers/app-provider'

import { OrgRepoBySlugLoader } from './org-repo-by-slug-loader'

export function OrgApp({ orgSlug }: { orgSlug: string }) {
  return (
    <AppProvider>
      <OrgRepoBySlugLoader orgSlug={orgSlug} />
    </AppProvider>
  )
}


