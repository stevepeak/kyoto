import { Command } from '@oclif/core'

export default class Craft extends Command {
  static override description = 'Craft stories or behaviors'

  static override examples = ['$ kyoto craft']

  override async run(): Promise<void> {
    // TODO: Implement craft logic
  }
}
