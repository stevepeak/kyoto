# Schemas Package

This package provides shared Zod schemas and TypeScript types.

## Exports

### Agent Types

- `Commit` - Commit information (message, diff, changedFiles)

### CLI Schemas

- `cliSessionResponseSchema` - CLI session response validation
- `CliSessionResponse` - CLI session response type

### Vibe Check Schemas

- `vibeCheckFileSchema` - Vibe check file validation
- `vibeCheckFindingSchema` - Vibe check finding validation
- `vibeCheckScopeSchema` - Vibe check scope validation
- `VibeCheckFile` - Vibe check file type
- `VibeCheckFileFinding` - Vibe check finding type
- `VibeCheckFileScope` - Vibe check scope type
- `VibeCheckAgentResult` - Vibe check agent result type
- `vibeCheckAgentResultSchema` - Vibe check agent result validation

## Usage

```typescript
import { type Commit, cliSessionResponseSchema } from '@app/schemas'

// Type usage
const commit: Commit = {
  message: 'fix: resolve bug',
  diff: '...',
  changedFiles: ['src/file.ts'],
}

// Schema validation
const session = cliSessionResponseSchema.parse(data)
```
