import { logger, task } from '@trigger.dev/sdk'
import { parseEnv } from '@app/agents'
import { setupDb } from '@app/db'

import { createOctokit } from '../helpers/github'

interface SyncGithubInstallationPayload {
  installationId: number | string | bigint
}

function hasLoginProperty(
  account: unknown,
): account is { login: string } & Record<string, unknown> {
  return (
    typeof account === 'object' &&
    account !== null &&
    'login' in account &&
    typeof (account as { login?: unknown }).login === 'string'
  )
}

function parseInstallationId(
  raw: SyncGithubInstallationPayload['installationId'],
): {
  numeric: number
  bigint: bigint
} {
  const asString = String(raw)
  const numeric = Number.parseInt(asString, 10)

  if (!Number.isFinite(numeric)) {
    throw new TypeError(`Invalid installation id: ${raw}`)
  }

  const bigint = BigInt(asString)

  return { numeric, bigint }
}

export const syncGithubInstallationTask = task({
  id: 'sync-github-installation',
  run: async (payload: SyncGithubInstallationPayload) => {
    const { numeric: installationId, bigint: installationIdBigInt } =
      parseInstallationId(payload.installationId)

    const env = parseEnv()
    const db = setupDb(env.DATABASE_URL)
    const octokit = createOctokit(installationId)

    const installation = await octokit.apps.getInstallation({
      installation_id: installationId,
    })

    const account = installation.data.account

    if (!hasLoginProperty(account)) {
      throw new TypeError(
        `Missing account information for installation ${installationId}`,
      )
    }

    const ownerExternalId =
      typeof account.id === 'number' || typeof account.id === 'string'
        ? BigInt(String(account.id))
        : null

    const ownerValues = {
      login: account.login,
      name: 'name' in account ? (account.name ?? null) : null,
      type: 'type' in account ? (account.type as string | null) : null,
      avatarUrl: 'avatar_url' in account ? (account.avatar_url ?? null) : null,
      htmlUrl: 'html_url' in account ? (account.html_url ?? null) : null,
      externalId: ownerExternalId,
      installationId: installationIdBigInt,
    }

    const owner = await db
      .insertInto('owners')
      .values(ownerValues)
      .onConflict((oc) =>
        oc.column('login').doUpdateSet({
          name: ownerValues.name,
          type: ownerValues.type,
          avatarUrl: ownerValues.avatarUrl,
          htmlUrl: ownerValues.htmlUrl,
          externalId: ownerValues.externalId,
          installationId: ownerValues.installationId,
        }),
      )
      .returning(['id', 'login'])
      .executeTakeFirst()

    if (!owner) {
      throw new Error('Failed to upsert owner record')
    }

    const repos = await octokit.paginate(
      octokit.apps.listReposAccessibleToInstallation,
      {
        installation_id: installationId,
        per_page: 100,
      },
    )

    await db.transaction().execute(async (trx) => {
      for (const repo of repos) {
        const repoExternalId =
          typeof repo.id === 'number' || typeof repo.id === 'string'
            ? BigInt(String(repo.id))
            : null

        await trx
          .insertInto('repos')
          .values({
            ownerId: owner.id,
            externalId: repoExternalId,
            name: repo.name,
            fullName: repo.full_name ?? null,
            description: repo.description ?? null,
            defaultBranch: repo.default_branch ?? null,
            htmlUrl: repo.html_url ?? null,
            private: repo.private ?? false,
          })
          .onConflict((oc) =>
            oc.columns(['ownerId', 'name']).doUpdateSet({
              externalId: repoExternalId,
              fullName: repo.full_name ?? null,
              description: repo.description ?? null,
              defaultBranch: repo.default_branch ?? null,
              htmlUrl: repo.html_url ?? null,
              private: repo.private ?? false,
            }),
          )
          .execute()
      }
    })

    logger.info('Synced GitHub installation', {
      installationId,
      ownerLogin: owner.login,
      repoCount: repos.length,
    })

    return {
      success: true,
      installationId,
      ownerLogin: owner.login,
      repoCount: repos.length,
    }
  },
})
