import { createHmac } from 'node:crypto'

import type { Kysely } from 'kysely'

import type { DB } from '@app/db/types'

export type BadgeStatusLabel = 'Operational' | 'At risk'

export interface BadgeMetrics {
  storyCount: number
  statusLabel: BadgeStatusLabel
  /**
   * Indicates whether the metrics came from real repo data or a
   * deterministic fake fallback. This is for internal use only and
   * should not affect the public badge output.
   */
  source: 'real' | 'fake'
}

export interface BadgeMetricsInput {
  db: Kysely<DB>
  orgName: string
  repoName: string
  /**
   * Secret used to seed deterministic fake values for slugs that
   * do not resolve to a repo in our database or when lookups fail.
   */
  secret: string
}

function normalizeSlug(orgName: string, repoName: string): string {
  return `${orgName}/${repoName}`.toLowerCase()
}

function mapRunStatusToBadgeStatus(
  status: string | null | undefined,
): BadgeStatusLabel {
  if (status === 'pass') {
    return 'Operational'
  }

  return 'At risk'
}

function generateFakeBadgeMetrics(
  slug: string,
  secret: string,
): BadgeMetrics {
  const hmac = createHmac('sha256', secret)
  hmac.update(slug)
  const digest = hmac.digest()

  const storyCount = 5 + (digest[0] % 95)
  const isOperational = (digest[1] & 1) === 0

  return {
    storyCount,
    statusLabel: isOperational ? 'Operational' : 'At risk',
    source: 'fake',
  }
}

export async function getRepoBadgeMetrics(
  input: BadgeMetricsInput,
): Promise<BadgeMetrics> {
  const { db, orgName, repoName, secret } = input
  const slug = normalizeSlug(orgName, repoName)

  try {
    const repo = await db
      .selectFrom('repos')
      .innerJoin('owners', 'owners.id', 'repos.ownerId')
      .select(['repos.id as id'])
      .where('owners.login', '=', orgName)
      .where('repos.name', '=', repoName)
      .executeTakeFirst()

    if (!repo) {
      return generateFakeBadgeMetrics(slug, secret)
    }

    const storyCountRow = await db
      .selectFrom('stories')
      .select((eb) => eb.fn.count('stories.id').as('count'))
      .where('repoId', '=', repo.id)
      .where('state', '!=', 'archived')
      .executeTakeFirst()

    const storyCount = Number(storyCountRow?.count ?? 0)

    const latestRun = await db
      .selectFrom('runs')
      .select(['status', 'createdAt'])
      .where('repoId', '=', repo.id)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .executeTakeFirst()

    const statusLabel = mapRunStatusToBadgeStatus(latestRun?.status)

    return {
      storyCount,
      statusLabel,
      source: 'real',
    }
  } catch (_error) {
    return generateFakeBadgeMetrics(slug, secret)
  }
}
