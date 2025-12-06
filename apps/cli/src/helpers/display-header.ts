import chalk from 'chalk'
import { execa } from 'execa'

/**
 * Displays the Kyoto CLI header with red kanji and greeting.
 *
 * @param logger - A function that logs messages (typically from oclif's log method)
 */
export function displayHeader(logger: (message: string) => void): void {
  const linkUrl = `https://usekyoto.com/`
  const kyotoLink = `\u001B]8;;${linkUrl}\u0007${chalk.white.bold('Kyoto')}\u001B]8;;\u0007`

  logger(
    `${chalk.red(`
入  ｜ 
京  ｜ 
行  ｜  `)}${kyotoLink}${chalk.red(` 
改  ｜ 
善  ｜ 

`)}`,
  )
}
