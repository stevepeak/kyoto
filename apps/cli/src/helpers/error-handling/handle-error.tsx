import { Text } from 'ink'
import React from 'react'

import { type Logger } from '../../types/logger'

export interface ErrorContext {
  logger: Logger
  setExitCode?: (code: number) => void
}

interface ErrorHandler {
  canHandle: (error: unknown) => boolean
  handle: (error: unknown, context: ErrorContext) => void
}

/**
 * Checks if an error is an API key/authentication error
 */
function isApiKeyError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }
  const message = error.message.toLowerCase()
  return (
    message.includes('api key') ||
    message.includes('authentication') ||
    message.includes('unauthorized')
  )
}

/**
 * Checks if an error is a Vercel AI Gateway error
 */
function isGatewayError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }
  const message = error.message
  return (
    message.includes('Vercel AI Gateway') ||
    message.includes('Gateway request failed') ||
    message.includes('Invalid error response format')
  )
}

/**
 * Handles API key/authentication errors
 */
const apiKeyErrorHandler: ErrorHandler = {
  canHandle: isApiKeyError,
  handle: (_error, { logger, setExitCode }) => {
    logger(
      <Text color="#c27a52">
        The API key appears to be invalid or expired.\n
      </Text>,
    )
    logger(
      <Text color="#7c6653">
        Please check your API key configuration. Run `kyoto setup ai` to
        reconfigure.\n
      </Text>,
    )
    if (setExitCode) {
      setExitCode(1)
    }
  },
}

/**
 * Handles Vercel AI Gateway errors
 */
const gatewayErrorHandler: ErrorHandler = {
  canHandle: isGatewayError,
  handle: (_error, { logger, setExitCode }) => {
    logger(<Text color="#c27a52">AI Gateway error detected.\n</Text>)
    logger(
      <Text color="#7c6653">
        The AI Gateway request failed. This could be due to:\n
      </Text>,
    )
    logger(<Text color="#7c6653"> - Invalid or expired API key\n</Text>)
    logger(<Text color="#7c6653"> - Network connectivity issues\n</Text>)
    logger(
      <Text color="#7c6653"> - Gateway service temporarily unavailable\n</Text>,
    )
    logger(
      <Text color="#7c6653">
        \nRun `kyoto setup ai` to reconfigure your API key, or try using
        --provider openai instead.\n
      </Text>,
    )
    if (setExitCode) {
      setExitCode(1)
    }
  },
}

/**
 * Default error handler for unknown errors
 */
const defaultErrorHandler: ErrorHandler = {
  canHandle: () => true,
  handle: (error, { logger, setExitCode }) => {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.'
    logger(<Text color="#7c6653">{`Error: ${message}\n`}</Text>)
    if (setExitCode) {
      setExitCode(1)
    }
  },
}

/**
 * List of error handlers in order of priority
 */
const errorHandlers: ErrorHandler[] = [
  apiKeyErrorHandler,
  gatewayErrorHandler,
  defaultErrorHandler,
]

/**
 * Handles an error using the registered error handlers.
 * Errors are handled by the first handler that can handle them.
 */
export function handleError(error: unknown, context: ErrorContext): void {
  for (const handler of errorHandlers) {
    if (handler.canHandle(error)) {
      handler.handle(error, context)
      return
    }
  }
}

/**
 * Determines if an error should be handled at the command level
 * (e.g., file not found errors that are specific to a command)
 */
export function shouldHandleInCommand(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }
  const message = error.message.toLowerCase()
  return (
    message.includes('not found') ||
    message.includes('path is not a file') ||
    message.includes('path is not a directory')
  )
}

/**
 * Determines if an error is critical and should stop processing
 * (e.g., API key errors, gateway errors that affect all operations)
 */
export function isCriticalError(error: unknown): boolean {
  return isApiKeyError(error) || isGatewayError(error)
}
