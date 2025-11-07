import { createHash } from 'node:crypto'

import { QdrantClient } from '@qdrant/js-client-rest'
import { OpenAIEmbedding } from '@zilliz/claude-context-core'
import { logger } from '@trigger.dev/sdk'

import { parseEnv } from '@/helpers/env'

const EMBEDDING_MODEL_ID = 'text-embedding-3-small'

export async function embedQuery(query: string): Promise<number[]> {
  const env = parseEnv()

  const embedding = new OpenAIEmbedding({
    apiKey: env.OPENAI_API_KEY,
    model: EMBEDDING_MODEL_ID,
  })

  const result = await embedding.embed(query)
  const vector = result.vector

  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error('Failed to generate embedding for search query')
  }

  return vector
}

export function getQdrantClient(): QdrantClient {
  const env = parseEnv()

  return new QdrantClient({
    url: env.QDRANT_URL,
    apiKey: env.QDRANT_API_KEY,
  })
}

export interface QdrantSearchContext {
  repoId: string
  branch: string
}

export interface CodeSearchHit {
  id: string
  path: string
  content: string
  commitSha: string
  branch: string | null
  score: number
}

type SearchParams = Parameters<QdrantClient['search']>[1]

function ensureStringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

export async function performQdrantSearch(
  context: QdrantSearchContext,
  vector: number[],
  limit: number,
): Promise<CodeSearchHit[]> {
  const collectionName = `repo_embeddings_${context.repoId}`
  const qdrantClient = getQdrantClient()

  const searchParams: SearchParams = {
    vector,
    limit,
    with_payload: true,
  }

  try {
    const searchResult = await qdrantClient.search(collectionName, searchParams)

    return searchResult.map((point) => {
      const payload = toRecord(point.payload)
      return {
        id: String(
          point.id ??
            createHash('sha1').update(JSON.stringify(point)).digest('hex'),
        ),
        path: ensureStringValue(payload.path),
        content: ensureStringValue(payload.content),
        commitSha: ensureStringValue(payload.commitSha),
        branch:
          typeof payload.branch === 'string' && payload.branch.length > 0
            ? payload.branch
            : null,
        score: Number(point.score ?? 0),
      }
    })
  } catch (error) {
    const errorDetails = buildQdrantErrorDetails(error, {
      repoId: context.repoId,
      commitSha: 'unknown',
      branch: context.branch,
      collection: collectionName,
      fileCount: 0,
    })

    logger.error('Failed to search Qdrant for code files', errorDetails)
    throw error
  }
}

interface QdrantErrorContext {
  repoId: string
  commitSha: string
  branch?: string
  collection?: string
  file?: string
  fileSize?: number
  fileId?: string
  fileCount?: number
}

function extractQdrantErrorMessage(errorData: unknown): string | null {
  if (!errorData || typeof errorData !== 'object') {
    return null
  }

  const data = errorData as Record<string, unknown>

  if (typeof data.status === 'object' && data.status !== null) {
    const status = data.status as Record<string, unknown>
    if (typeof status.error === 'string') {
      return status.error
    }
    if (typeof status.message === 'string') {
      return status.message
    }
  }

  if (typeof data.error === 'string') {
    return data.error
  }

  if (typeof data.message === 'string') {
    return data.message
  }

  if (typeof data.detail === 'string') {
    return data.detail
  }

  if (Array.isArray(data.errors)) {
    const errors = data.errors
      .map((e) => {
        if (typeof e === 'string') {
          return e
        }
        if (e && typeof e === 'object') {
          const err = e as Record<string, unknown>
          return (
            (typeof err.message === 'string' ? err.message : null) ||
            (typeof err.error === 'string' ? err.error : null) ||
            JSON.stringify(e)
          )
        }
        return String(e)
      })
      .filter(Boolean)
    if (errors.length > 0) {
      return errors.join('; ')
    }
  }

  return null
}

export function buildQdrantErrorDetails(
  error: unknown,
  context: QdrantErrorContext,
): Record<string, unknown> {
  const errorDetails: Record<string, unknown> = {
    repoId: context.repoId,
    commitSha: context.commitSha,
    branch: context.branch ?? null,
  }

  if (context.collection) {
    errorDetails.collection = context.collection
  }

  if (context.file) {
    errorDetails.file = context.file
  }

  if (context.fileSize !== undefined) {
    errorDetails.fileSize = context.fileSize
  }

  if (context.fileId) {
    errorDetails.fileId = context.fileId
  }

  if (context.fileCount !== undefined) {
    errorDetails.fileCount = context.fileCount
  }

  if (error instanceof Error) {
    errorDetails.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  } else {
    errorDetails.error = { type: typeof error, value: String(error) }
  }

  const qdrantError = error as {
    response?: {
      status?: number
      statusText?: string
      data?: unknown
      _data?: unknown
    }
    body?: unknown
    data?: unknown
    message?: string
  }

  if (qdrantError.response) {
    const response = qdrantError.response
    errorDetails.qdrantResponse = {
      status: response.status,
      statusText: response.statusText,
      data: response.data ?? response._data,
    }

    const errorMessage = extractQdrantErrorMessage(
      response.data ?? response._data,
    )
    if (errorMessage) {
      errorDetails.qdrantErrorMessage = errorMessage
    }
  }

  if (qdrantError.body) {
    errorDetails.qdrantBody = qdrantError.body
    const errorMessage = extractQdrantErrorMessage(qdrantError.body)
    if (errorMessage) {
      errorDetails.qdrantErrorMessage = errorMessage
    }
  }

  if (qdrantError.data) {
    errorDetails.qdrantData = qdrantError.data
    const errorMessage = extractQdrantErrorMessage(qdrantError.data)
    if (errorMessage) {
      errorDetails.qdrantErrorMessage = errorMessage
    }
  }

  return errorDetails
}
