import { OrgRepoBySlugLoader } from '@/components/features/repos/org-repo-by-slug-loader'

export function OrgPage({ orgName }: { orgName: string }) {
  return <OrgRepoBySlugLoader orgName={orgName} />
}
