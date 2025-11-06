import type { DB } from '@app/db/types'
import type { Kysely } from 'kysely'
import { createOctokit } from '../helpers/github'

export interface SyncGithubInstallationResult {
  ownerId: string
  ownerLogin: string
  repoCount: number
}

export async function syncGithubInstallationStep(params: {
  db: Kysely<DB>
  installationId: number
}): Promise<SyncGithubInstallationResult> {
  const { db, installationId } = params

  const installationOctokit = createOctokit(installationId)

  const installation = await installationOctokit.apps.getInstallation({
    installation_id: installationId,
  })
  const account = installation.data.account as unknown as {
    id?: number
    login?: string
    name?: string
    type?: string
    avatar_url?: string
    html_url?: string
    slug?: string
  }
  const ownerExternalId = account?.id
  const ownerLogin =
    account && 'login' in account && account.login
      ? account.login
      : (account?.slug ?? account?.name ?? '')

  // Upsert owner
  const installationIdBigInt = BigInt(installationId)
  const owner = await db
    .insertInto('owners')
    .values({
      externalId: ownerExternalId ?? null,
      login: ownerLogin,
      name: account?.name ?? null,
      type: account?.type ?? null,
      avatarUrl: account?.avatar_url ?? null,
      htmlUrl: account?.html_url ?? null,
      installationId: installationIdBigInt,
    })
    .onConflict((oc) =>
      oc.column('login').doUpdateSet({
        externalId: ownerExternalId ?? null,
        name: account?.name ?? null,
        type: account?.type ?? null,
        avatarUrl: account?.avatar_url ?? null,
        htmlUrl: account?.html_url ?? null,
        installationId: installationIdBigInt,
      }),
    )
    .returningAll()
    .executeTakeFirstOrThrow()

  // Fetch repositories for the installation
  const reposResponse = await installationOctokit.paginate(
    installationOctokit.apps.listReposAccessibleToInstallation,
    {
      per_page: 100,
    },
  )

  // Upsert repos; preserve existing enabled flag if present
  let repoCount = 0
  for (const repo of reposResponse as Array<{
    id: number
    name: string
    full_name?: string
    private?: boolean
    description?: string | null
    default_branch?: string
    html_url?: string
  }>) {
    const repoExternalId = BigInt(repo.id)
    // Use number for where clause (Int8 accepts number | bigint | string)
    const existing = await db
      .selectFrom('repos')
      .selectAll()
      .where('externalId', '=', repo.id as unknown as never)
      .executeTakeFirst()

    const enabled =
      (existing as unknown as { enabled?: boolean } | undefined)?.enabled ??
      false

    await db
      .insertInto('repos')
      .values({
        ownerId: owner.id,
        externalId: repoExternalId,
        name: repo.name,
        fullName: repo.full_name ?? null,
        private: repo.private ?? false,
        description: repo.description ?? null,
        defaultBranch: repo.default_branch ?? null,
        htmlUrl: repo.html_url ?? null,
        enabled,
      })
      .onConflict((oc) =>
        oc.columns(['ownerId', 'name']).doUpdateSet({
          fullName: repo.full_name ?? null,
          private: repo.private ?? false,
          description: repo.description ?? null,
          defaultBranch: repo.default_branch ?? null,
          htmlUrl: repo.html_url ?? null,
          enabled,
        }),
      )
      .execute()

    repoCount += 1
  }

  return { ownerId: owner.id, ownerLogin, repoCount }
}
