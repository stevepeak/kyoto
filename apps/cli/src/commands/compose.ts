import { Command } from '@oclif/core'

export default class Compose extends Command {
  static override description = 'Compose stories or behaviors'

  static override examples = ['$ kyoto compose']

  override async run(): Promise<void> {
    // TODO: Implement compose logic
  }
}

