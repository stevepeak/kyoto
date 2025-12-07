import { Command } from '@oclif/core'

export default class TestBrowser extends Command {
  static override description = 'Run browser tests'

  static override examples = ['$ kyoto test:browser']

  override async run(): Promise<void> {
    await this.parse(TestBrowser)
    // TODO: Implement test:browser logic
  }
}
