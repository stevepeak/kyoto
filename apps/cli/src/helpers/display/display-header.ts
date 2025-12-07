import chalk from 'chalk'

interface DisplayHeaderArgs {
  logger: (message: string) => void
  message?: string
}

/**
 * Displays the Kyoto CLI header with red kanji and greeting.
 *
 * @param args - Arguments object
 * @param args.logger - A function that logs messages (typically from oclif's log method)
 * @param args.message - Optional message to display (defaults to "Kyoto")
 */
export function displayHeader(args: DisplayHeaderArgs): void {
  const { logger, message = 'Kyoto' } = args
  const styledText = chalk.white.bold(message)

  logger(
    `${chalk.red(`
入   |  
京   |  
行   |   `)}${styledText}${chalk.red(` 
改   |  
善   |  

`)}`,
  )
}
