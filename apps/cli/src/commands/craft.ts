import { Command } from '@oclif/core'

export default class Craft extends Command {
  static override description = 'Craft stories or behaviors'

  static override examples = ['$ kyoto craft']

  override async run(): Promise<void> {
    await this.parse(Craft)
    // TODO: Implement craft logic
  }
}
