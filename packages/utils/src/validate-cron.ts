import { CronExpressionParser } from 'cron-parser'

/**
 * Validates that a cron schedule has a minimum interval of 1 hour between executions.
 *
 * @param cronSchedule - The cron expression to validate
 * @returns An object with isValid boolean and error message if invalid
 */
export function validateCronMinimumInterval(cronSchedule: string): {
  isValid: boolean
  error?: string
} {
  try {
    const interval = CronExpressionParser.parse(cronSchedule, {
      tz: 'UTC',
    })

    // Get the next 2 execution times
    const next1 = interval.next().toDate()
    const next2 = interval.next().toDate()

    // Calculate the difference in milliseconds
    const diffMs = next2.getTime() - next1.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    // Minimum interval is 1 hour
    const MIN_INTERVAL_HOURS = 1

    if (diffHours < MIN_INTERVAL_HOURS) {
      return {
        isValid: false,
        error: `Cron schedule must have a minimum interval of ${MIN_INTERVAL_HOURS} hour. Current interval is approximately ${diffHours.toFixed(2)} hours.`,
      }
    }

    return { isValid: true }
  } catch (error) {
    return {
      isValid: false,
      error:
        error instanceof Error
          ? `Invalid cron expression: ${error.message}`
          : 'Invalid cron expression',
    }
  }
}
