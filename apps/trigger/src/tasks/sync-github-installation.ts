import { logger, task } from '@trigger.dev/sdk'
import { parseEnv } from '@app/agents'
import { setupDb } from '@app/db'
import { Octokit } from '@octokit/rest'

import { createOctokit } from '../helpers/github'
import {
  ensureOwnerMemberships,
  ensureRepoMemberships,
  findRepoIdsByOwnerId,
  findUserIdsByGithubAccountId,
  pruneOwnerMemberships,
  pruneRepoMemberships,
} from './github/shared/db'

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

type AccountWithLogin = { login: string } & Record<string, unknown>

function getAccountName(account: AccountWithLogin): string | null {
  return typeof account.name === 'string' && account.name.length > 0
    ? account.name
    : null
}

function getAccountType(account: AccountWithLogin): string | null {
  return typeof account.type === 'string' && account.type.length > 0
    ? account.type
    : null
}

async function resolveAccountName(
  octokit: ReturnType<typeof createOctokit>,
  account: AccountWithLogin,
): Promise<string | null> {
  const existingName = getAccountName(account)

  if (existingName) {
    return existingName
  }

  const accountType = getAccountType(account)

  if (accountType === 'Organization') {
    const org = await octokit.rest.orgs.get({ org: account.login })

    return org.data.name ?? null
  }

  const user = await octokit.rest.users.getByUsername({
    username: account.login,
  })

  return user.data.name ?? null
}

function toAccountIdentifier(
  account: AccountWithLogin & { id?: unknown },
): string | null {
  if (
    typeof account.id === 'string' ||
    typeof account.id === 'number' ||
    typeof account.id === 'bigint'
  ) {
    const candidate = String(account.id).trim()

    if (candidate.length > 0) {
      return candidate
    }
  }

  const login = account.login.trim()

  return login.length > 0 ? login : null
}

async function fetchGithubMemberIdentifiers(
  octokit: ReturnType<typeof createOctokit>,
  account: AccountWithLogin,
): Promise<readonly string[]> {
  const accountType = getAccountType(account)?.toLowerCase() ?? null

  if (accountType === 'organization') {
    try {
      const members = await octokit.paginate(octokit.rest.orgs.listMembers, {
        org: account.login,
        per_page: 100,
        role: 'all',
      })

      return members
        .map((member) => {
          if (
            typeof member.id === 'string' ||
            typeof member.id === 'number' ||
            typeof member.id === 'bigint'
          ) {
            const id = String(member.id).trim()
            if (id.length > 0) {
              return id
            }
          }

          const login =
            typeof member.login === 'string' ? member.login.trim() : ''

          return login.length > 0 ? login : null
        })
        .filter((value): value is string => value !== null)
    } catch (error) {
      logger.warn('Failed to fetch GitHub organization members', {
        ownerLogin: account.login,
        error,
      })

      return []
    }
  }

  const identifier = toAccountIdentifier(account)

  return identifier ? [identifier] : []
}

interface GithubAccountRow {
  userId: string
  accountId: string
  accessToken: string | null
}

function buildAccountIdentifierIndex(
  accounts: GithubAccountRow[],
): Map<string, string> {
  const index = new Map<string, string>()

  for (const account of accounts) {
    const trimmed = account.accountId.trim()

    if (trimmed.length === 0) {
      continue
    }

    const variants = [trimmed, `github:${trimmed}`, `github|${trimmed}`]

    for (const key of variants) {
      if (!index.has(key)) {
        index.set(key, account.userId)
      }
    }
  }

  return index
}

async function mapGithubMembersToLocalUserIds(
  db: ReturnType<typeof setupDb>,
  githubIdentifiers: readonly string[],
  identifierIndex: Map<string, string>,
): Promise<Set<string>> {
  const uniqueIdentifiers = Array.from(new Set(githubIdentifiers))

  if (uniqueIdentifiers.length === 0) {
    return new Set()
  }

  const memberUserIds = new Set<string>()

  for (const identifier of uniqueIdentifiers) {
    const trimmed = identifier.trim()

    if (trimmed.length === 0) {
      continue
    }

    const variants = [trimmed, `github:${trimmed}`, `github|${trimmed}`]

    let matchedUserId: string | null = null

    for (const key of variants) {
      const userId = identifierIndex.get(key)

      if (userId) {
        matchedUserId = userId
        break
      }
    }

    if (!matchedUserId) {
      const [userId] = await findUserIdsByGithubAccountId(db, trimmed)

      if (userId) {
        matchedUserId = userId
      }
    }

    if (matchedUserId) {
      memberUserIds.add(matchedUserId)
    }
  }

  return memberUserIds
}

async function fetchLocalGithubAccounts(
  db: ReturnType<typeof setupDb>,
): Promise<GithubAccountRow[]> {
  const accounts = await db
    .selectFrom('accounts')
    .select(['userId', 'accountId', 'accessToken'])
    .where('providerId', '=', 'github')
    .execute()

  return accounts.map((account) => ({
    userId: account.userId,
    accountId: account.accountId ?? '',
    accessToken: account.accessToken ?? null,
  }))
}

async function resolveMembershipViaUserTokens(
  accounts: GithubAccountRow[],
  orgLogin: string,
): Promise<Set<string>> {
  const confirmedUserIds = new Set<string>()

  for (const account of accounts) {
    if (!account.accessToken) {
      continue
    }

    const userOctokit = new Octokit({
      auth: account.accessToken,
    })

    try {
      const membership =
        await userOctokit.rest.orgs.getMembershipForAuthenticatedUser({
          org: orgLogin,
        })

      if (membership.data?.state === 'active') {
        confirmedUserIds.add(account.userId)
      }
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        (error as { status?: number }).status === 404
      ) {
        // User is not a member of the organization.
        continue
      }

      logger.warn('Failed to verify org membership via user token', {
        orgLogin,
        userId: account.userId,
        error,
      })
    }
  }

  return confirmedUserIds
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

    try {
      const installation = await octokit.apps.getInstallation({
        installation_id: installationId,
      })

      const account = installation.data.account

      if (!hasLoginProperty(account)) {
        throw new TypeError(
          `Missing account information for installation ${installationId}`,
        )
      }

      const accountName = await resolveAccountName(octokit, account)

      const ownerExternalId =
        typeof account.id === 'number' || typeof account.id === 'string'
          ? BigInt(String(account.id))
          : null

      const ownerValues = {
        login: account.login,
        name: accountName,
        type: account.type,
        avatarUrl: account.avatar_url,
        htmlUrl: account.html_url,
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

      const repoIds = await findRepoIdsByOwnerId(db, owner.id)

      const githubAccounts = await fetchLocalGithubAccounts(db)
      const identifierIndex = buildAccountIdentifierIndex(githubAccounts)

      const githubMemberIdentifiers = await fetchGithubMemberIdentifiers(
        octokit,
        account,
      )
      const memberUserIds = await mapGithubMembersToLocalUserIds(
        db,
        githubMemberIdentifiers,
        identifierIndex,
      )

      const verifiedUserIds = await resolveMembershipViaUserTokens(
        githubAccounts,
        owner.login,
      )

      for (const userId of verifiedUserIds) {
        memberUserIds.add(userId)
      }

      const memberUserIdList = Array.from(memberUserIds)

      if (memberUserIdList.length > 0) {
        await ensureOwnerMemberships(db, {
          ownerId: owner.id,
          userIds: memberUserIdList,
        })

        if (repoIds.length > 0) {
          await ensureRepoMemberships(db, {
            repoIds,
            userIds: memberUserIdList,
          })
        }

        await pruneOwnerMemberships(db, {
          ownerId: owner.id,
          keepUserIds: memberUserIdList,
        })

        if (repoIds.length > 0) {
          await pruneRepoMemberships(db, {
            repoIds,
            keepUserIds: memberUserIdList,
          })
        }
      } else {
        logger.warn(
          'No matching local users for GitHub installation membership',
          {
            installationId,
            ownerLogin: owner.login,
            githubMemberIdentifiers: githubMemberIdentifiers.length,
            localGithubAccounts: githubAccounts.length,
          },
        )
      }

      const membershipCounts = {
        githubMembers: new Set(githubMemberIdentifiers).size,
        localMembers: memberUserIdList.length,
      }

      logger.info('Synced GitHub installation', {
        installationId,
        ownerLogin: owner.login,
        repoCount: repos.length,
        ...membershipCounts,
      })

      return {
        success: true,
        installationId,
        ownerLogin: owner.login,
        repoCount: repos.length,
        ...membershipCounts,
      }
    } finally {
      await db.destroy()
    }
  },
})
