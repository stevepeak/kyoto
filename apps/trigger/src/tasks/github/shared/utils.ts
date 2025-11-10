import { logger } from '@trigger.dev/sdk'
import type { z } from 'zod'

import type { AccountPayload } from './schemas'
import type { idSchema } from './schemas'

export function parseId(
  value: z.infer<typeof idSchema>,
  field: string,
): bigint {
  try {
    return BigInt(String(value))
  } catch (error) {
    throw new TypeError(`Invalid ${field}: ${String(value)}`, {
      cause: error instanceof Error ? error : undefined,
    })
  }
}

export function toNullableString(
  value: string | null | undefined,
): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

export function resolveAccountExternalId(
  account: AccountPayload,
): bigint | null {
  if (account.id === undefined) {
    return null
  }

  try {
    return parseId(account.id, 'account.id')
  } catch (error) {
    logger.warn('Unable to parse account external id', {
      error,
      accountId: account.id,
      login: account.login,
    })
  }

  return null
}

export function resolveRepositoryOwnerLogin(
  owner: { login?: string | null; name?: string | null } | null | undefined,
): string | null {
  if (!owner) {
    return null
  }

  const candidate = owner.login ?? owner.name

  if (typeof candidate !== 'string') {
    return null
  }

  const trimmed = candidate.trim()

  return trimmed.length > 0 ? trimmed : null
}

export function extractBranchNameFromRef(
  ref: string | null | undefined,
): string | null {
  if (typeof ref !== 'string') {
    return null
  }

  const trimmed = ref.trim()

  if (trimmed.length === 0) {
    return null
  }

  const headPrefix = 'refs/heads/'

  if (!trimmed.startsWith(headPrefix)) {
    return null
  }

  const branch = trimmed.slice(headPrefix.length).trim()

  return branch.length > 0 ? branch : null
}
