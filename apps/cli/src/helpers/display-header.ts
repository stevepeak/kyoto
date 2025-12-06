import chalk from 'chalk'
import terminalLink from 'terminal-link'

/**
 * Displays the Kyoto CLI header with red kanji and greeting.
 *
 * @param logger - A function that logs messages (typically from oclif's log method)
 */
export function displayHeader(logger: (message: string) => void): void {
  const linkUrl = `https://usekyoto.com/`
  const styledText = chalk.white.bold('Kyoto')
  const kyotoLink = terminalLink(styledText, linkUrl)

  logger(
    `${chalk.red(`
入   |  
京   |  
行   |   `)}${kyotoLink}${chalk.red(` 
改   |  
善   |  

`)}`,
  )
}
