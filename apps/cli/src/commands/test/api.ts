import { Command } from '@oclif/core'

export default class TestApi extends Command {
  static override description = 'Run API tests'

  static override examples = ['$ kyoto test:api']

  override async run(): Promise<void> {
    // TODO: Implement test:api logic
  }
}

