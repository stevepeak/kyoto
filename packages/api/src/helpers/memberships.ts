import { TRPCError } from '@trpc/server'
import type { DB, Owner, Repo, Story } from '@app/db/types'
import { eq, and } from 'drizzle-orm'
import {
  owners,
  ownerMemberships,
  repos,
  repoMemberships,
  stories,
} from '@app/db/schema'

interface WithUserId {
  userId: string
}

export async function findOwnerForUser(
  db: DB,
  params: WithUserId & { orgName: string },
): Promise<Owner | null> {
  const result = await db
    .select()
    .from(owners)
    .innerJoin(ownerMemberships, eq(ownerMemberships.ownerId, owners.id))
    .where(
      and(
        eq(owners.login, params.orgName),
        eq(ownerMemberships.userId, params.userId),
      ),
    )
    .limit(1)

  return result[0]?.owners ?? null
}

export async function findRepoForUser(
  db: DB,
  params: WithUserId & { orgName: string; repoName: string },
): Promise<Repo | null> {
  const result = await db
    .select()
    .from(repos)
    .innerJoin(owners, eq(owners.id, repos.ownerId))
    .innerJoin(repoMemberships, eq(repoMemberships.repoId, repos.id))
    .innerJoin(
      ownerMemberships,
      and(
        eq(ownerMemberships.ownerId, repos.ownerId),
        eq(ownerMemberships.userId, repoMemberships.userId),
      ),
    )
    .where(
      and(
        eq(owners.login, params.orgName),
        eq(repos.name, params.repoName),
        eq(repoMemberships.userId, params.userId),
      ),
    )
    .limit(1)

  return result[0]?.repos ?? null
}

export async function requireRepoForUser(
  db: DB,
  params: WithUserId & { orgName: string; repoName: string },
): Promise<Repo> {
  const repo = await findRepoForUser(db, params)

  if (!repo) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Repository not accessible',
    })
  }

  return repo
}

export async function findStoryForUser(
  db: DB,
  params: WithUserId & { storyId: string },
): Promise<{ story: Story; repo: Repo } | null> {
  const storyResult = await db
    .select()
    .from(stories)
    .where(eq(stories.id, params.storyId))
    .limit(1)

  if (!storyResult[0]) {
    return null
  }

  const story = storyResult[0]

  const repoResult = await db
    .select()
    .from(repos)
    .innerJoin(repoMemberships, eq(repoMemberships.repoId, repos.id))
    .innerJoin(
      ownerMemberships,
      and(
        eq(ownerMemberships.ownerId, repos.ownerId),
        eq(ownerMemberships.userId, repoMemberships.userId),
      ),
    )
    .where(
      and(
        eq(repos.id, story.repoId),
        eq(repoMemberships.userId, params.userId),
      ),
    )
    .limit(1)

  if (!repoResult[0]) {
    return null
  }

  return { story, repo: repoResult[0].repos }
}
