import { Command } from '@oclif/core'

export default class TestCli extends Command {
  static override description = 'Run CLI tests'

  static override examples = ['$ kyoto test:cli']

  override async run(): Promise<void> {
    await this.parse(TestCli)
    // TODO: Implement test:cli logic
  }
}
