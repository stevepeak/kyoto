import { Text } from 'ink'
import React from 'react'

import { type Logger } from '../../types/logger'
import {
  type ErrorContext,
  handleError,
  shouldHandleInCommand,
} from './handle-error'

/**
 * Handles an error in a command context.
 * If the error should be handled in the command (e.g., file not found),
 * it returns true and the command should handle it.
 * Otherwise, it handles the error using the centralized error handling.
 *
 * @returns true if the error was handled by the command-specific handler,
 *          false if it was handled by the centralized handler
 */
export function handleCommandError(error: unknown, logger: Logger): boolean {
  if (shouldHandleInCommand(error)) {
    // Let the command handle it
    return true
  }

  const context: ErrorContext = {
    logger,
    setExitCode: (code) => {
      process.exitCode = code
    },
  }

  handleError(error, context)
  return false
}

/**
 * Helper to format command-specific errors (e.g., file not found)
 */
export function formatCommandError(error: unknown): React.ReactElement {
  if (error instanceof Error) {
    return <Text color="#c27a52">{`\n⚠️  ${error.message}\n`}</Text>
  }
  return <Text color="#c27a52">{`\n⚠️  An unknown error occurred\n`}</Text>
}
