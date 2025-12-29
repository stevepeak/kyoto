/**
 * Extracts a comprehensive error message from various error formats.
 * Handles Error instances, AI SDK provider errors, and other error shapes.
 *
 * @param error - The error to extract a message from
 * @returns A human-readable error message
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const errorObj = error as unknown as Record<string, unknown>
    const parts: string[] = []

    // Check for response-like errors (common in AI SDK)
    if (
      'response' in errorObj &&
      typeof errorObj.response === 'object' &&
      errorObj.response !== null
    ) {
      const response = errorObj.response as Record<string, unknown>

      // Extract status and statusText
      const status = 'status' in response ? response.status : null
      const statusText =
        'statusText' in response && typeof response.statusText === 'string'
          ? response.statusText
          : null

      // Try to extract error details from response body
      let bodyError: string | null = null

      // Check response.body (common in fetch responses)
      if ('body' in response) {
        bodyError = extractErrorFromBody(response.body)
      }

      // Check response.data (alternative response format)
      if (!bodyError && 'data' in response) {
        bodyError = extractErrorFromBody(response.data)
      }

      // Check response.error (nested error object)
      if (
        !bodyError &&
        'error' in response &&
        typeof response.error === 'object' &&
        response.error !== null
      ) {
        bodyError = extractErrorFromBody(response.error)
      }

      // Build error message
      if (bodyError) {
        parts.push(bodyError)
      } else if (statusText) {
        parts.push(statusText)
      }

      if (status) {
        parts.push(`(status: ${String(status)})`)
      } else if ('statusCode' in response) {
        parts.push(`(status: ${String(response.statusCode)})`)
      }
    }

    // Check for data property directly on error (alternative format)
    if (parts.length === 0 && 'data' in errorObj) {
      const dataError = extractErrorFromBody(errorObj.data)
      if (dataError) {
        parts.push(dataError)
      }
    }

    // Check for status/statusCode directly on error
    if (
      ('status' in errorObj || 'statusCode' in errorObj) &&
      parts.length === 0
    ) {
      const status =
        'status' in errorObj ? errorObj.status : errorObj.statusCode
      const baseMessage = error.message || 'Provider returned error'
      parts.push(baseMessage)
      parts.push(`(status: ${String(status)})`)
    }

    // Check if there's a cause with more details
    if (error.cause instanceof Error && error.cause.message) {
      parts.unshift(error.cause.message)
    }

    // If we have extracted parts, join them
    if (parts.length > 0) {
      return parts.join(' ')
    }

    // Return the error message, or default if empty
    return error.message || 'Unknown error occurred'
  }

  if (typeof error === 'string') {
    return error
  }

  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>

    // Try to extract from body/data first
    if ('data' in errorObj) {
      const dataError = extractErrorFromBody(errorObj.data)
      if (dataError) {
        return dataError
      }
    }

    if ('message' in errorObj && typeof errorObj.message === 'string') {
      return errorObj.message
    }
  }

  return 'Unknown error occurred'
}

/**
 * Extracts error message from various body formats (JSON strings, objects, etc.)
 */
function extractErrorFromBody(body: unknown): string | null {
  if (body === null || body === undefined) {
    return null
  }

  // If it's already a string, try to parse it as JSON
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body)
      return extractErrorFromBody(parsed)
    } catch {
      // If parsing fails, it might just be a plain error message
      return body
    }
  }

  // If it's an object, look for common error message fields
  if (typeof body === 'object') {
    const bodyObj = body as Record<string, unknown>

    // Check nested error object
    if ('error' in bodyObj) {
      if (typeof bodyObj.error === 'string') {
        return bodyObj.error
      }
      if (typeof bodyObj.error === 'object' && bodyObj.error !== null) {
        const nestedError = extractErrorFromBody(bodyObj.error)
        if (nestedError) {
          return nestedError
        }
      }
    }

    // Check for metadata.raw (common in OpenRouter/AI SDK errors)
    if (
      'metadata' in bodyObj &&
      typeof bodyObj.metadata === 'object' &&
      bodyObj.metadata !== null
    ) {
      const metadata = bodyObj.metadata as Record<string, unknown>
      if ('raw' in metadata && typeof metadata.raw === 'string') {
        // Try to parse the raw JSON string
        try {
          const rawParsed = JSON.parse(metadata.raw)
          const rawError = extractErrorFromBody(rawParsed)
          if (rawError) {
            return rawError
          }
        } catch {
          // If parsing fails, use the raw string as-is
          return metadata.raw
        }
      }
    }

    // Check for common error message fields
    const messageFields = [
      'message',
      'error',
      'detail',
      'details',
      'reason',
      'description',
    ]
    for (const field of messageFields) {
      if (
        field in bodyObj &&
        typeof bodyObj[field] === 'string' &&
        bodyObj[field]
      ) {
        return bodyObj[field] as string
      }
    }

    // Check for errors array
    if ('errors' in bodyObj && Array.isArray(bodyObj.errors)) {
      const errors = bodyObj.errors as unknown[]
      const errorMessages = errors
        .map((e) => extractErrorFromBody(e))
        .filter((msg): msg is string => msg !== null)
      if (errorMessages.length > 0) {
        return errorMessages.join('; ')
      }
    }
  }

  return null
}
