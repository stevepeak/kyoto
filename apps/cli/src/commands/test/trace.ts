import { Command } from '@oclif/core'

export default class TestTrace extends Command {
  static override description = 'Run tests with trace'

  static override examples = ['$ kyoto test:trace']

  override async run(): Promise<void> {
    await this.parse(TestTrace)
    // TODO: Implement test:trace logic
  }
}
