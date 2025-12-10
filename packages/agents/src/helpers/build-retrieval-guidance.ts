import { type VibeCheckScope } from '@app/types'
import { dedent } from 'ts-dedent'

export function buildRetrievalGuidance(scope: VibeCheckScope): string {
  switch (scope.type) {
    case 'commit':
      return dedent`
        - Use \`git show --name-only ${scope.commit}\` to see the changed files
        - Use \`git show ${scope.commit}\` to see the full diff
        - Use \`git diff ${scope.commit}^..${scope.commit}\` to see what changed
        - Filter for TypeScript files (.ts, .tsx) only
      `
    case 'commits':
      return dedent`
        - Use \`git show --name-only <sha>\` for each commit to see changed files
        - Use \`git diff <sha1>^..<sha2>\` to see changes across commits
        - Filter for TypeScript files (.ts, .tsx) only
      `
    case 'staged':
      return dedent`
        - Use \`git diff --cached --name-only\` to list staged files
        - Use \`git diff --cached\` to see the staged changes
        - Filter for TypeScript files (.ts, .tsx) only
      `
    case 'unstaged':
      return dedent`
        - Use \`git diff --name-only\` to list modified files
        - Use \`git diff\` to see unstaged changes
        - Use \`git ls-files --others --exclude-standard\` to list untracked files
        - Filter for TypeScript files (.ts, .tsx) only
      `
    case 'paths':
      return dedent`
        - Read the specified files directly using the readFile tool
        - Filter for TypeScript files (.ts, .tsx) only
      `
  }
}
