import { type Metadata } from 'next'
import { redirect } from 'next/navigation'

import { CraftStoryForm } from '@/components/forms/craft-story-form'
import { getSession } from '@/lib/auth-server'
import { checkOwnerMembership, checkRepoMembership } from '@/lib/memberships'

export const dynamic = 'force-dynamic'
export const dynamicParams = true

interface CraftPageRouteProps {
  params: Promise<{ owner: string; repo: string }>
}

export async function generateMetadata(
  props: CraftPageRouteProps,
): Promise<Metadata> {
  const params = await props.params
  const { owner, repo } = params

  const session = await getSession()
  if (!session?.user?.id) {
    return {
      title: `Craft Story - ${owner}/${repo} - Kyoto`,
      description: 'Create a new story on Kyoto',
    }
  }

  const ownerData = await checkOwnerMembership({
    userId: session.user.id,
    orgSlug: owner,
  })

  if (!ownerData) {
    return {
      title: `Craft Story - ${owner}/${repo} - Kyoto`,
      description: 'Create a new story on Kyoto',
    }
  }

  const repoData = await checkRepoMembership({
    userId: session.user.id,
    orgSlug: owner,
    repoSlug: repo,
  })

  if (!repoData) {
    return {
      title: `Craft Story - ${owner}/${repo} - Kyoto`,
      description: 'Create a new story on Kyoto',
    }
  }

  return {
    title: `Craft Story - ${owner}/${repoData.name} - Kyoto`,
    description: `Create a new story in ${repoData.name} repository on Kyoto`,
  }
}

export default async function CraftPageRoute(props: CraftPageRouteProps) {
  const params = await props.params
  const { owner, repo } = params

  const session = await getSession()
  if (!session?.user?.id) {
    redirect(`/login?redirect=/${owner}/${repo}/craft`)
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

  return <CraftStoryForm owner={owner} repo={repoData.name} />
}
