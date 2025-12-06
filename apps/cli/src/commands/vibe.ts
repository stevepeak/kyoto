import { Command } from '@oclif/core'
import { displayHeader } from '../helpers/display-header.js'

export default class Vibe extends Command {
  static override description = 'Display the Kyoto CLI header'

  static override examples = ['$ kyoto vibe']

  override async run(): Promise<void> {
    const logger = (message: string) => {
      this.log(message)
    }

    displayHeader(logger)
  }
}
