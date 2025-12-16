import { type Metadata } from 'next'
import { redirect } from 'next/navigation'

import { RepoPage } from '@/components/pages/repo-page'
import { getSession } from '@/lib/auth-server'
import { checkOwnerMembership, checkRepoMembership } from '@/lib/memberships'

export const dynamic = 'force-dynamic'

interface RepoPageRouteProps {
  params: Promise<{ owner: string; repo: string }>
}

export async function generateMetadata(
  props: RepoPageRouteProps,
): Promise<Metadata> {
  const params = await props.params
  const { owner, repo } = params

  const session = await getSession()
  if (!session?.user?.id) {
    return {
      title: `${owner}/${repo} - Kyoto`,
      description: 'Repository page on Kyoto',
    }
  }

  const ownerData = await checkOwnerMembership({
    userId: session.user.id,
    orgSlug: owner,
  })

  if (!ownerData) {
    return {
      title: `${owner}/${repo} - Kyoto`,
      description: 'Repository page on Kyoto',
    }
  }

  const repoData = await checkRepoMembership({
    userId: session.user.id,
    orgSlug: owner,
    repoSlug: repo,
  })

  if (!repoData) {
    return {
      title: `${owner}/${repo} - Kyoto`,
      description: 'Repository page on Kyoto',
    }
  }

  return {
    title: `${owner}/${repoData.name} - Kyoto`,
    description: `View ${repoData.name} repository on Kyoto`,
  }
}

export default async function RepoPageRoute(props: RepoPageRouteProps) {
  const params = await props.params
  const { owner, repo } = params

  const session = await getSession()
  if (!session?.user?.id) {
    redirect(`/login?redirect=/${owner}/${repo}`)
  }

  const ownerData = await checkOwnerMembership({
    userId: session.user.id,
    orgSlug: owner,
  })

  if (!ownerData) {
    return (
      <div className="container mx-auto py-12">
        <h1 className="text-2xl font-semibold">Organization not found</h1>
        <p className="mt-4 text-muted-foreground">
          You don&apos;t have access to this organization or it doesn&apos;t
          exist.
        </p>
      </div>
    )
  }

  const repoData = await checkRepoMembership({
    userId: session.user.id,
    orgSlug: owner,
    repoSlug: repo,
  })

  if (!repoData) {
    return (
      <div className="container mx-auto py-12">
        <h1 className="text-2xl font-semibold">Repository not found</h1>
        <p className="mt-4 text-muted-foreground">
          You don&apos;t have access to this repository or it doesn&apos;t
          exist.
        </p>
      </div>
    )
  }

  return <RepoPage owner={ownerData} repo={repoData} />
}
