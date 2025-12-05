import chalk from 'chalk'

/**
 * Displays the Kyoto CLI header with red kanji and greeting.
 *
 * @param logger - A function that logs messages (typically from oclif's log method)
 */
export function displayHeader(logger: (message: string) => void): void {
  logger(chalk.red('こ ん に ち は 京'))
  logger(
    chalk.bold.white(
      chalk.red('——') + '    Kyoto    ' + chalk.red('——') + '\n',
    ),
  )
}
