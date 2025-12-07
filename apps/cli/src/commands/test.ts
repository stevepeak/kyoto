import { Command } from '@oclif/core'

export default class Test extends Command {
  static override description = 'Run tests'

  static override examples = ['$ kyoto test']

  override async run(): Promise<void> {
    await this.parse(Test)
    // TODO: Implement test logic
  }
}
