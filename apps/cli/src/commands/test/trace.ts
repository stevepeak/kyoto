import { Command } from '@oclif/core'

export default class TestTrace extends Command {
  static override description = 'Run tests with trace'

  static override examples = ['$ kyoto test:trace']

  override async run(): Promise<void> {
    // TODO: Implement test:trace logic
  }
}
