# Agent V2 Architecture

## Overview

V2 represents a significant architectural change from V1, moving from a nested agent pattern to a unified single-agent approach with direct tool access.

## Key Changes from V1

### 1. **Single Agent Instead of Nested Agents**

**V1 Approach:**

- Main story evaluator agent that calls `searchCode` tool
- `searchCode` is itself a nested `ToolLoopAgent` with its own agent loop
- Two separate system prompts and agent execution contexts

**V2 Approach:**

- Single unified agent with one system prompt
- Direct access to `terminalCommand` and `readFile` tools
- More efficient execution with fewer agent loops

### 2. **Direct Sandbox Access**

**V1:**

```typescript
// searchCode is a nested agent
const searchCodeTool = await createSearchCodeTool({
  sandbox,
  repoName: options.repoName,
  model: openAiProvider(SEARCH_CODE_AGENT_MODEL),
})

const agent = new ToolLoopAgent({
  tools: {
    shareThought: shareThoughtTool,
    searchCode: searchCodeTool, // nested agent
  },
})
```

**V2:**

```typescript
// Direct tool access
const terminalCommandTool = createTerminalCommandTool({
  sandbox,
  repoName: options.repoName,
})

const readFileTool = createReadFileTool({
  sandbox,
  repoName: options.repoName,
})

const agent = new ToolLoopAgent({
  tools: {
    shareThought: shareThoughtTool,
    terminalCommand: terminalCommandTool, // direct tool
    readFile: readFileTool, // direct tool
  },
})
```

### 3. **Unified System Prompt**

The V2 system prompt combines the best elements from both V1 agents:

- Story evaluation logic from `story-evaluator`
- Code search strategies from `search-code-tool`
- Direct instructions for sandbox interaction

## Benefits

1. **Performance**: Fewer agent loops mean faster execution
2. **Simplicity**: Single system prompt is easier to maintain and debug
3. **Control**: Direct tool access provides more granular control
4. **Transparency**: Single agent execution is easier to trace and understand

## Tools Available

### `shareThought`

- Captures intermediate reasoning and observations
- Used to document search strategy and findings
- Helpful for human review of agent decisions

### `terminalCommand`

- Execute read-only shell commands in the Daytona sandbox
- Examples: `rg`, `fd`, `tree`, `git`, `grep`
- Returns stdout on success, error JSON on failure

### `readFile`

- Read full file contents from the sandbox
- Used to verify code context and extract precise snippets
- Supports both absolute and repo-relative paths

### `resolveLibrary`

- Resolve a library/package name to get its Context7 library ID
- Use when you need to understand how a specific library or framework works
- Example: "react", "next.js", "tailwindcss"

### `getLibraryDocs`

- Fetch up-to-date documentation for a library using its Context7 ID
- Use after `resolveLibrary` to get detailed documentation
- Supports optional topic parameter to focus on specific features
- Returns documentation about APIs, patterns, or features

## Usage

```typescript
import { runStoryEvaluationAgentV2 } from '@app/agents'

const result = await runStoryEvaluationAgentV2({
  storyName: 'User can log in',
  storyText: 'As a user, I want to log in...',
  repoId: 'repo-123',
  repoName: 'my-app',
  branchName: 'main',
  daytonaSandboxId: 'sandbox-456',
})
```

## Migration Notes

- V1 agents remain available for backward compatibility
- V2 exports are aliased with `V2` suffix: `runStoryEvaluationAgentV2`
- Both versions use the same output schema
- No changes required to consuming code, just update the function import
