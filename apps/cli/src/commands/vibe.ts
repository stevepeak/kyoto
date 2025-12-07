import { Command } from '@oclif/core'

import { displayHeader } from '../helpers/display/display-header.js'

export default class Vibe extends Command {
  static override description = 'Display the Kyoto CLI header'

  static override examples = ['$ kyoto vibe']

  // eslint-disable-next-line @typescript-eslint/require-await
  override async run(): Promise<void> {
    await this.parse(Vibe)

    const logger = (message: string) => {
      this.log(message)
    }

    displayHeader({ logger })
  }
}
