import { OrgRepoBySlugLoader } from './org-repo-by-slug-loader'

export function OrgApp({ orgName }: { orgName: string }) {
  return <OrgRepoBySlugLoader orgName={orgName} />
}
