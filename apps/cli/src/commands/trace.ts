import { Args, Command } from '@oclif/core'

export default class Trace extends Command {
  static override description =
    'List stories that have evidence pointing to the source lines asked to trace'

  static override examples = [
    '$ kyoto trace',
    '$ kyoto trace path/to/file.ts:10:20',
  ]

  static override args = {
    source: Args.string({
      description:
        'Source file path with optional line numbers (e.g., "path/to/file.ts:10:20" or "path/to/file.ts")',
      required: false,
    }),
  }

  override async run(): Promise<void> {
    const { args } = await this.parse(Trace)

    // TODO: List stories that have evidence pointing to the source lines asked to trace.
    // This is helpful to understand "WHAT" behavior users this code
    // eslint-disable-next-line no-console
    console.log(
      'TODO: List stories that have evidence pointing to the source lines asked to trace. This is helpful to understand "WHAT" behavior users this code',
    )

    if (args.source) {
      // eslint-disable-next-line no-console
      console.log(`Source: ${args.source}`)
    }
  }
}
