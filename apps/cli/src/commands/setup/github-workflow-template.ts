import { dedent } from 'ts-dedent'

export function createWorkflowContent(): string {
  return dedent`
    name: Kyoto

    on:
      push:
        branches:
          - main
      pull_request:

    jobs:
      kyoto:
        runs-on: ubuntu-latest
        permissions:
          checks: write
          contents: read
        env:
          KYOTO_TOKEN: \${{ secrets.KYOTO_TOKEN }}
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with:
              node-version: '22'
          - run: npx @usekyoto/cli vibe check
  `
}
