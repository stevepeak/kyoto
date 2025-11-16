# Manus Context Engineering Principles - Implementation Plan for Kyoto

## Executive Summary

This plan maps the key insights from the Manus article ("Context Engineering for AI Agents") to Kyoto's multi-agent story-driven QA system. The focus is on optimizing KV-cache reuse, managing context growth, and improving agent reliability through context engineering rather than just model improvements.

---

## Current Architecture Analysis

### What We Have
- **Multi-agent system**: Decomposition Agent → Evaluation Agent (sequential step evaluation)
- **Tools**: `terminalCommand`, `readFile`, `resolveLibrary`, `getLibraryDocs`, `lsp`
- **Caching**: File hash-based evidence caching with step/assertion-level invalidation
- **Context passing**: `StepContext` type with previous results, story info, repo outline
- **Agent framework**: Vercel AI SDK with `Experimental_Agent`

### Current Issues (Based on Manus Principles)

1. **❌ Unstable prompt prefixes**: `buildEvaluationInstructions()` is called per step with dynamic `repoOutline` in system prompt
2. **❌ No append-only logs**: Context is rebuilt each step, previous actions/observations not preserved in structured format
3. **❌ No task plan recitation**: No mechanism to keep current goals in recent attention window
4. **❌ Fixed tools but no masking**: Tools are fixed per agent, but no state-based masking mechanism
5. **❌ No external memory**: Large context (repo snapshots, test history) is inlined rather than referenced
6. **❌ Errors may be hidden**: Errors are logged but not necessarily kept in agent context
7. **❌ Non-deterministic serialization**: JSON serialization may have unstable key ordering
8. **❌ Dynamic content in prefix**: `repoOutline` is computed and embedded in system prompt

---

## Implementation Plan

### 1. Stable Prompt Prefix System

**Goal**: Maximize KV-cache reuse by keeping system prompt prefix absolutely stable across runs.

**Current Problem**:
```typescript
// packages/agents/src/agents/v3/story-evaluator.ts:56-109
function buildEvaluationInstructions(repoOutline: string): string {
  return `
You are an expert software QA engineer...
# Repository Overview
${repoOutline}  // ❌ Dynamic content breaks cache
`
}
```

**Solution**:
- Extract fixed role definitions, tool descriptions, rules into a constant `STABLE_SYSTEM_PREFIX`
- Move dynamic content (`repoOutline`, story-specific context) to user prompt or append-only context section
- Use deterministic session identifiers (UUID-based, no timestamps in prefix)

**Files to modify**:
- `packages/agents/src/agents/v3/story-evaluator.ts`
- `packages/agents/src/agents/v3/story-decomposition.ts`
- Create: `packages/agents/src/helpers/prompt-prefixes.ts`

**Implementation**:
```typescript
// packages/agents/src/helpers/prompt-prefixes.ts
export const EVALUATION_AGENT_STABLE_PREFIX = `
You are an expert software QA engineer evaluating whether a specific step from a user story is properly implemented given the current repository state.

# Role & Objective
[... fixed instructions ...]

# Tools
- **terminalCommand**: Execute read-only shell commands...
- **readFile**: Read the full contents of a file...
[... fixed tool descriptions ...]

# Rules
[... fixed rules ...]
`.trim()

// Dynamic content goes in user prompt, not system prompt
```

---

### 2. Append-Only Action Trace Log

**Goal**: Preserve all tool invocations, observations, and results in chronological order without modification.

**Current Problem**: Context is rebuilt each step, losing detailed action history.

**Solution**:
- Create `ActionTraceLog` type to record: tool name, input, output, timestamp, step index
- Append to log after each tool call, never modify previous entries
- Include log in context (last N entries) for agent awareness

**Files to create**:
- `packages/agents/src/helpers/action-trace.ts`

**Implementation**:
```typescript
// packages/agents/src/helpers/action-trace.ts
export type ActionTraceEntry = {
  stepIndex: number
  timestamp: string // ISO 8601, deterministic
  tool: string
  input: unknown
  output: unknown
  error?: {
    message: string
    stack?: string
  }
}

export type ActionTraceLog = {
  sessionId: string
  entries: ActionTraceEntry[]
}

export function appendActionTrace(
  log: ActionTraceLog,
  entry: Omit<ActionTraceEntry, 'timestamp'>
): ActionTraceLog {
  return {
    ...log,
    entries: [
      ...log.entries,
      {
        ...entry,
        timestamp: new Date().toISOString(),
      },
    ],
  }
}

export function formatActionTraceForContext(
  log: ActionTraceLog,
  maxEntries: number = 20
): string {
  const recent = log.entries.slice(-maxEntries)
  return recent
    .map((entry) => {
      const error = entry.error
        ? `\nERROR: ${entry.error.message}`
        : ''
      return `[Step ${entry.stepIndex}] ${entry.tool}(${JSON.stringify(entry.input)}) → ${JSON.stringify(entry.output)}${error}`
    })
    .join('\n')
}
```

**Integration**: Modify agent to wrap tool calls and append to trace log.

---

### 3. Task Plan Recitation

**Goal**: Keep current objectives/goals in recent attention window to prevent agent drift.

**Current Problem**: No mechanism to remind agent of overall task during long evaluation sequences.

**Solution**:
- Create `TaskPlan` type with current step, completed steps, remaining steps
- Update plan after each step completion
- Include plan in last ~200 tokens of context (recitation section)

**Files to create**:
- `packages/agents/src/helpers/task-plan.ts`

**Implementation**:
```typescript
// packages/agents/src/helpers/task-plan.ts
export type TaskPlan = {
  sessionId: string
  storyName: string
  totalSteps: number
  currentStepIndex: number
  completedSteps: Array<{
    stepIndex: number
    conclusion: 'pass' | 'fail'
    outcome: string
  }>
  remainingSteps: Array<{
    stepIndex: number
    goal: string
  }>
  updatedAt: string
}

export function updateTaskPlan(
  plan: TaskPlan,
  stepResult: { conclusion: 'pass' | 'fail'; outcome: string }
): TaskPlan {
  const current = plan.remainingSteps[0]
  return {
    ...plan,
    currentStepIndex: plan.currentStepIndex + 1,
    completedSteps: [
      ...plan.completedSteps,
      {
        stepIndex: current.stepIndex,
        conclusion: stepResult.conclusion,
        outcome: stepResult.outcome,
      },
    ],
    remainingSteps: plan.remainingSteps.slice(1),
    updatedAt: new Date().toISOString(),
  }
}

export function formatTaskPlanForContext(plan: TaskPlan): string {
  const completed = plan.completedSteps
    .map((s) => `${s.conclusion === 'pass' ? '✅' : '❌'} Step ${s.stepIndex + 1}: ${s.outcome}`)
    .join('\n')
  const current = plan.remainingSteps[0]
    ? `\n🔄 CURRENT: Step ${current.stepIndex + 1}: ${current.goal}`
    : ''
  const remaining = plan.remainingSteps
    .slice(1)
    .map((s) => `⬜ Step ${s.stepIndex + 1}: ${s.goal}`)
    .join('\n')

  return `# Task Plan: ${plan.storyName}
Completed (${plan.completedSteps.length}/${plan.totalSteps}):
${completed}${current}
Remaining:
${remaining}`
}
```

**Integration**: Include formatted plan in user prompt after each step.

---

### 4. Tool Masking System

**Goal**: Use fixed tool registry with state-based masking instead of dynamic tool injection.

**Current Problem**: Tools are fixed per agent, but no mechanism to disable tools based on state (e.g., disable deployment tools during code review).

**Solution**:
- Create `ToolRegistry` with canonical tool definitions
- Implement masking via token logit constraints or tool availability flags
- Keep tool definitions stable across runs

**Files to create**:
- `packages/agents/src/helpers/tool-registry.ts`

**Implementation**:
```typescript
// packages/agents/src/helpers/tool-registry.ts
export type ToolDefinition = {
  name: string
  description: string
  inputSchema: z.ZodSchema
  execute: (input: unknown) => Promise<unknown>
}

export type ToolRegistry = {
  tools: Map<string, ToolDefinition>
  mask: Set<string> // Tool names to mask/disable
}

export function createToolRegistry(
  tools: Record<string, ToolDefinition>
): ToolRegistry {
  return {
    tools: new Map(Object.entries(tools)),
    mask: new Set(),
  }
}

export function maskTools(
  registry: ToolRegistry,
  toolNames: string[]
): ToolRegistry {
  return {
    ...registry,
    mask: new Set([...registry.mask, ...toolNames]),
  }
}

export function getAvailableTools(registry: ToolRegistry): Record<string, ToolDefinition> {
  const available: Record<string, ToolDefinition> = {}
  for (const [name, def] of registry.tools) {
    if (!registry.mask.has(name)) {
      available[name] = def
    }
  }
  return available
}
```

**Note**: Vercel AI SDK may not support token logit masking directly. Alternative: conditionally include tools in agent config, but keep definitions stable.

---

### 5. External Memory / File System References

**Goal**: Reference large context via file:// or db:// URIs instead of inlining.

**Current Problem**: Large content (repo snapshots, test history) is inlined in prompts.

**Solution**:
- Create `ExternalMemory` type for file/db references
- Add `readExternalMemory` tool for agents to fetch referenced content on-demand
- Store large context in persistent storage (vector DB, file system, database)

**Files to create**:
- `packages/agents/src/helpers/external-memory.ts`
- `packages/agents/src/tools/external-memory-tool.ts`

**Implementation**:
```typescript
// packages/agents/src/helpers/external-memory.ts
export type ExternalMemoryReference = 
  | { type: 'file'; path: string }
  | { type: 'db'; table: string; id: string }
  | { type: 'vector'; query: string; limit: number }

export type ExternalMemory = {
  ref: ExternalMemoryReference
  metadata: {
    size: number
    createdAt: string
    description: string
  }
}

// packages/agents/src/tools/external-memory-tool.ts
export function createExternalMemoryTool(ctx: {
  sandbox: Sandbox
  db: Kysely<DB>
}): Tool {
  return tool({
    name: 'readExternalMemory',
    description: 'Read content from external memory references (file://, db://, vector://)',
    inputSchema: z.object({
      ref: z.string().describe('Memory reference URI (e.g., "file://repo-snapshot.json", "db://story_test_results/abc123")'),
    }),
    execute: async (input) => {
      // Parse URI and fetch content
      // Return content or reference
    },
  })
}
```

**Integration**: Replace inline `repoOutline` with `file://repo-outline.json` reference.

---

### 6. Keep Failures in Context

**Goal**: Append error traces to action log instead of hiding them.

**Current Problem**: Errors are logged but may not be visible to agent in subsequent steps.

**Solution**:
- Standardize error annotation format in action trace
- Include error traces in context
- Don't filter out failed tool calls from history

**Implementation**:
```typescript
// In action-trace.ts (already defined above)
export type ActionTraceEntry = {
  // ... existing fields
  error?: {
    message: string
    stack?: string
    tool: string
    input: unknown
  }
}

// When tool call fails:
appendActionTrace(log, {
  stepIndex,
  tool: toolName,
  input: toolInput,
  output: null,
  error: {
    message: error.message,
    stack: error.stack,
    tool: toolName,
    input: toolInput,
  },
})
```

**Integration**: Wrap all tool executions in try-catch, append errors to trace.

---

### 7. Deterministic Serialization

**Goal**: Ensure stable JSON key ordering for cache consistency.

**Current Problem**: JSON.stringify() may have non-deterministic key ordering.

**Solution**:
- Create canonical JSON serializer that sorts keys alphabetically
- Use for all context objects passed to agents

**Files to create**:
- `packages/utils/src/canonical-json.ts`

**Implementation**:
```typescript
// packages/utils/src/canonical-json.ts
export function canonicalStringify(obj: unknown): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Sort keys alphabetically
      const sorted = Object.keys(value)
        .sort()
        .reduce((acc, k) => {
          acc[k] = value[k]
          return acc
        }, {} as Record<string, unknown>)
      return sorted
    }
    return value
  })
}
```

**Integration**: Use for serializing `StepContext`, `ActionTraceLog`, etc.

---

### 8. Refactor System Prompt Construction

**Goal**: Separate stable prefix from dynamic content.

**Current Problem**: Dynamic content (`repoOutline`) is embedded in system prompt.

**Solution**:
- Move dynamic content to user prompt or append-only context section
- Keep system prompt absolutely static

**Files to modify**:
- `packages/agents/src/agents/v3/story-evaluator.ts`
- `packages/agents/src/agents/v3/story-decomposition.ts`

**Implementation**:
```typescript
// Before:
const agent = new Agent({
  system: buildEvaluationInstructions(repoOutline), // ❌ Dynamic
  // ...
})

// After:
const agent = new Agent({
  system: EVALUATION_AGENT_STABLE_PREFIX, // ✅ Static
  // ...
})

// Dynamic content in user prompt:
const prompt = `
${buildStepPrompt({ stepContext })}

# Repository Context
${repoOutline}  // ✅ In user prompt, not system

# Action History
${formatActionTraceForContext(actionLog)}

# Current Task Plan
${formatTaskPlanForContext(taskPlan)}
`
```

---

## Implementation Priority

### Phase 1: High Impact, Low Risk
1. **Stable prompt prefix** (#1, #8) - Immediate cache improvement
2. **Deterministic serialization** (#7) - Foundation for caching
3. **Append-only action trace** (#2) - Better observability

### Phase 2: Medium Impact, Medium Risk
4. **Task plan recitation** (#3) - Prevents drift
5. **Keep failures in context** (#6) - Improves robustness

### Phase 3: Lower Priority
6. **Tool masking** (#4) - Nice to have, may require SDK changes
7. **External memory** (#5) - Requires infrastructure (vector DB, storage)

---

## Success Metrics

- **Cache hit rate**: Measure KV-cache reuse across runs (via telemetry)
- **Token usage**: Track input/output token counts before/after
- **Latency**: Measure agent response time improvements
- **Agent reliability**: Track step completion rate, error recovery
- **Cost**: Monitor API costs (should decrease with better caching)

---

## Files to Create/Modify

### New Files
- `packages/agents/src/helpers/prompt-prefixes.ts`
- `packages/agents/src/helpers/action-trace.ts`
- `packages/agents/src/helpers/task-plan.ts`
- `packages/agents/src/helpers/tool-registry.ts`
- `packages/agents/src/helpers/external-memory.ts`
- `packages/agents/src/tools/external-memory-tool.ts`
- `packages/utils/src/canonical-json.ts`

### Modified Files
- `packages/agents/src/agents/v3/story-evaluator.ts`
- `packages/agents/src/agents/v3/story-decomposition.ts`
- `packages/agents/src/index.ts` (export new helpers)

---

## Notes

- Vercel AI SDK may not support token logit masking directly. Tool masking may need to be implemented via conditional tool inclusion.
- External memory requires persistent storage infrastructure (vector DB, file storage). Consider using existing cache/DB infrastructure.
- Session IDs should be deterministic (UUID-based, no timestamps) to maximize cache reuse.
- All timestamps should use ISO 8601 format for deterministic serialization.
