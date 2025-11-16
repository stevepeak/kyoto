import { OrgApp } from '@/components/apps/org-app'

// Org pages are user-specific and always dynamic
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default async function OrgPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <OrgApp orgName={slug} />
}
