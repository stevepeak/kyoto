import { Command } from '@oclif/core'

export default class Mcp extends Command {
  static override description = 'MCP command'

  static override examples = ['$ kyoto mcp']

  override async run(): Promise<void> {
    await this.parse(Mcp)
    // TODO: Implement mcp logic
  }
}
