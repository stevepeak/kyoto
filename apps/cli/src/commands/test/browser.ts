import { Command } from '@oclif/core'

export default class TestBrowser extends Command {
  static override description = 'Run browser tests'

  static override examples = ['$ kyoto test:browser']

  override async run(): Promise<void> {
    // TODO: Implement test:browser logic
  }
}
