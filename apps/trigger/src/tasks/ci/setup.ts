import { and, eq, type RunStory, schema, sql } from '@app/db'

import { type GitAuthor } from '../../helpers/github'
import {
  type DbClient,
  type RepoRecord,
  type RunCiPayload,
  type RunInsert,
  type StoryRow,
} from './types'

export function getBranchName(payload: RunCiPayload): string {
  return payload.branchName?.trim() || 'main'
}

export async function getRepoRecord(
  db: DbClient,
  payload: RunCiPayload,
): Promise<RepoRecord> {
  const repoRecords = await db
    .select({
      repoId: schema.repos.id,
      defaultBranch: schema.repos.defaultBranch,
      repoName: schema.repos.name,
      ownerLogin: schema.owners.login,
    })
    .from(schema.repos)
    .innerJoin(schema.owners, eq(schema.repos.ownerId, schema.owners.id))
    .where(
      and(
        eq(schema.owners.login, payload.orgName),
        eq(schema.repos.name, payload.repoName),
      ),
    )
    .limit(1)

  const repoRecord = repoRecords[0]

  if (!repoRecord) {
    throw new Error(
      `Repository ${payload.orgName}/${payload.repoName} not found in database`,
    )
  }

  return repoRecord
}

export async function getStories(
  db: DbClient,
  repoId: string,
): Promise<Omit<StoryRow, 'branchName'>[]> {
  return await db
    .select({
      id: schema.stories.id,
      name: schema.stories.name,
      story: schema.stories.story,
    })
    .from(schema.stories)
    .where(
      and(
        eq(schema.stories.repoId, repoId),
        eq(schema.stories.state, 'active'),
      ),
    )
}

export function buildInitialRunStories(stories: StoryRow[]): RunStory[] {
  return stories.map((story) => ({
    storyId: story.id,
    status: 'running',
    resultId: null,
    startedAt: new Date().toISOString(),
    summary: null,
    completedAt: null,
  }))
}

export function getInitialRunMeta(stories: StoryRow[]): {
  runStatus: 'skipped' | 'running'
  runSummary: string | null
} {
  if (stories.length === 0) {
    return {
      runStatus: 'skipped',
      runSummary: 'No stories available for evaluation',
    }
  }

  return {
    runStatus: 'running',
    runSummary: null,
  }
}

interface CreateRunRecordParams {
  db: DbClient
  repoId: string
  branchName: string
  runStatus: 'skipped' | 'running'
  initialRunStories: RunStory[]
  commitSha: string | null
  commitMessage: string | null
  runSummary: string | null
  prNumber?: string | null
  gitAuthor?: GitAuthor | null
  extTriggerDev: { runId: string } | null
}

export async function createRunRecord({
  db,
  repoId,
  branchName,
  runStatus,
  initialRunStories,
  commitSha,
  commitMessage,
  runSummary,
  prNumber = null,
  gitAuthor = null,
  extTriggerDev,
}: CreateRunRecordParams): Promise<RunInsert> {
  const gitAuthorJson =
    gitAuthor && (gitAuthor.id || gitAuthor.login || gitAuthor.name)
      ? {
          id: gitAuthor.id ?? null,
          login: gitAuthor.login ?? null,
          name: gitAuthor.name ?? null,
        }
      : null

  // Calculate the next run number for this repo
  const maxNumberResult = await db
    .select({
      maxNumber: sql<number>`max(${schema.runs.number})`.as('maxNumber'),
    })
    .from(schema.runs)
    .where(eq(schema.runs.repoId, repoId))

  const nextNumber = (maxNumberResult[0]?.maxNumber ?? 0) + 1

  const insertedRuns = await db
    .insert(schema.runs)
    .values({
      repoId,
      branchName,
      status: runStatus,
      stories: initialRunStories,
      commitSha,
      commitMessage,
      prNumber,
      summary: runSummary,
      gitAuthor: gitAuthorJson,
      extTriggerDev,
      number: nextNumber,
    })
    .returning({ id: schema.runs.id, number: schema.runs.number })

  const runInsert = insertedRuns[0]

  if (!runInsert) {
    throw new Error('Failed to create run record')
  }

  return runInsert
}

export function buildRunDetailsUrl(
  baseUrl: string | undefined,
  repoRecord: RepoRecord,
  runNumber: number,
): string | null {
  if (!baseUrl) {
    return null
  }

  return `${baseUrl}/org/${repoRecord.ownerLogin}/repo/${repoRecord.repoName}/runs/${runNumber}`
}
