## How to Add New Agents to Kyoto

### 1. **Agent Interface** (`VibeCheckAgent`)

Agents implement the `VibeCheckAgent` interface from `@app/types`:

```34:42:packages/types/src/index.ts
export interface VibeCheckAgent {
  id: string
  label: string
  description?: string
  run: (
    context: VibeCheckContext,
    reporter: VibeCheckReporter,
  ) => Promise<VibeCheckResult>
}
```

### 2. **Two-Layer Architecture**

- `@app/agents` package: Core AI agent logic (uses Vercel AI SDK's `Agent`)
- `apps/cli/src/agents`: Thin wrapper that implements `VibeCheckAgent` and calls the core logic

### 3. **Step-by-Step Process**

#### Step 1: Create the core agent function in `@app/agents`

Create a new file in `packages/agents/src/agents/` (e.g., `my-new-agent.ts`):

```typescript
// packages/agents/src/agents/my-new-agent.ts
import {
  createLocalReadFileTool,
  createLocalTerminalCommandTool,
} from '@app/shell'
import { type VibeCheckScope } from '@app/types'
import { Agent, Output } from 'ai'
import { dedent } from 'ts-dedent'
import { z } from 'zod'
import { buildRetrievalGuidance } from '../helpers/build-retrieval-guidance'

// Define output schema
export const myNewAgentOutputSchema = z.object({
  findings: z.array(
    z.object({
      message: z.string(),
      path: z.string().optional(),
      suggestion: z.string().optional(),
      severity: z.enum(['info', 'warn', 'error']),
    }),
  ),
})

export async function analyzeMyNewAgent({
  scope,
  options: { maxSteps = 30, model, progress } = {},
}: {
  scope: VibeCheckScope
  options?: {
    maxSteps?: number
    model?: LanguageModel
    progress?: (message: string) => void
  }
}) {
  const agent = new Agent({
    model,
    system: dedent`
      Your agent's system prompt here...
      ${buildRetrievalGuidance(scope)}
    `,
    tools: {
      terminalCommand: createLocalTerminalCommandTool(progress),
      readFile: createLocalReadFileTool(progress),
    },
    stopWhen: stepCountIs(maxSteps),
    onStepFinish: (step) => {
      if (step.reasoningText && step.reasoningText !== '[REDACTED]') {
        progress?.(step.reasoningText)
      }
    },
    experimental_output: Output.object({
      schema: myNewAgentOutputSchema,
    }),
  })

  const result = await agent.generate({
    prompt: 'Your analysis prompt here...',
  })

  return result.experimental_output
}
```

#### Step 2: Export from `@app/agents`

Add to `packages/agents/src/index.ts`:

```typescript
export {
  analyzeMyNewAgent,
  myNewAgentOutputSchema,
} from './agents/my-new-agent'
```

#### Step 3: Create the CLI wrapper

Create `apps/cli/src/agents/my-new-agent.ts`:

```typescript
import { analyzeMyNewAgent } from '@app/agents'
import { type VibeCheckAgent, type VibeCheckResult } from '@app/types'

export const myNewAgent: VibeCheckAgent = {
  id: 'my-new-agent',
  label: 'My New Agent',
  description: 'What this agent does',
  async run(context, reporter): Promise<VibeCheckResult> {
    reporter.progress('Starting...')

    const result = await analyzeMyNewAgent({
      scope: context.scope,
      options: {
        progress: reporter.progress,
      },
    })

    if (result.findings.length === 0) {
      return {
        status: 'pass',
        summary: 'No issues found',
        findings: [],
      }
    }

    return {
      status: 'warn', // or 'fail' for errors
      summary: `${result.findings.length} issue(s) found`,
      findings: result.findings,
    }
  },
}
```

#### Step 4: Register the agent

Add to `apps/cli/src/agents/index.ts`:

```typescript
import { functionConsolidationAgent } from './function-consolidation'
import { myNewAgent } from './my-new-agent'

export const defaultVibeCheckAgents = [
  functionConsolidationAgent,
  myNewAgent, // Add your new agent here
]
```

### 4. **Available Tools**

Agents can use tools from `@app/shell`:

- `createLocalTerminalCommandTool` - Execute git/terminal commands
- `createLocalReadFileTool` - Read files from the repo
- `createLocalCreateDirectoryTool` - Create directories
- `createLocalUpdateStoryTool` - Update story files

### 5. **Helper Utilities**

- `buildRetrievalGuidance(scope)` - Generates git command guidance based on the `VibeCheckScope` (staged, unstaged, commits, etc.)

### 6. **Execution Flow**

1. User runs `kyoto vibe check`
2. `VibeCheck` command loads `defaultVibeCheckAgents`
3. Each agent runs in parallel via `VibeAgents` component
4. Each agent's `run()` method is called with `VibeCheckContext` and `VibeCheckReporter`
5. Results are collected and written to a plan file

### Example Pattern

The `function-consolidation` agent shows the pattern:

- Core logic: `packages/agents/src/agents/function-consolidation.ts`
- CLI wrapper: `apps/cli/src/agents/function-consolidation.ts`
- Registered in: `apps/cli/src/agents/index.ts`

This keeps the AI logic in `@app/agents` reusable, while the CLI wrappers handle the vibe check interface.
