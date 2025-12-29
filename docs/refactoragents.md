# Refactor Security Audit to Sub-Tasks

## Status Summary

✅ **Completed:**

- All 11 sub-task files created and implemented
- Sub-task structure with typed inputs, browser sessions, format conversion, error handling
- Parent task refactored to orchestrate sub-tasks via `batchTriggerAndWait()`
- Result aggregation, metrics calculation, and database persistence
- Browser session management with proper cleanup

⚠️ **Remaining:**

- Code Analysis Context Setup (TODO in `run.ts` lines 76-101)
  - Need to implement repo cloning and VibeCheckContext creation when `audit.repoId` exists
  - Currently `codeAnalysisContext` is always `null`, so code analysis audits won't run

## Overview

Refactor the security audit system to use independent sub-tasks that can run in parallel. Each sub-task manages its own browser session (for browser audits) and returns formatted check items. The parent task orchestrates all sub-tasks and handles database operations.

## Architecture

```javascript
Parent Task (security-audit/run.ts)
  ├─ Determines which sub-tasks to run
  ├─ Spawns all sub-tasks via tasks.batchTriggerAndWait()
  ├─ Aggregates results from all sub-tasks
  ├─ Calculates score and critical issues
  └─ Saves everything to database

Sub-Tasks (each in separate file)
  ├─ Browser audits (5): transport, headers, cookies, storage, console
  ├─ Code analysis audits (5): backend, frontend, database, infrastructure, dependency
  └─ CLI audit (1): CLI-based validation
```

## Implementation Plan

### 1. Create Sub-Task Files ✅

Create separate task files in `apps/trigger/src/tasks/security-audit/`:**Browser Audit Sub-Tasks:**

- ✅ `browser-transport.ts` - Transport security (HTTPS, certificates)
- ✅ `browser-headers.ts` - Security headers validation
- ✅ `browser-cookies.ts` - Cookie security (HttpOnly, Secure, SameSite)
- ✅ `browser-storage.ts` - Browser storage security (localStorage, sessionStorage)
- ✅ `browser-console.ts` - Console log security

**Code Analysis Sub-Tasks:**

- ✅ `code-backend.ts` - Backend security analysis
- ✅ `code-frontend.ts` - Frontend security analysis
- ✅ `code-database.ts` - Database security analysis
- ✅ `code-infrastructure.ts` - Infrastructure security analysis
- ✅ `code-dependency.ts` - Dependency security analysis

**CLI Audit Sub-Task:**

- ✅ `cli-audit.ts` - CLI-based security validation

### 2. Sub-Task Structure ✅

Each sub-task should:

- ✅ Accept typed input (targetUrl, model config, codeAnalysisContext if needed)
- ✅ Create its own browser session (for browser audits) using Stagehand
- ✅ Run the corresponding agent function
- ✅ Convert agent output to `securityAuditCheckItemSchema[]` format
- ✅ Return formatted checks with metadata (method, tool, date, severity)
- ✅ Handle errors gracefully and return empty checks array on failure
- ✅ NOT interact with database

**Example sub-task input type:**

```typescript
type BrowserAuditSubTaskInput = {
  targetUrl: string
  userApiKey: string // OpenRouter API key
  modelName: string // e.g., 'openai/gpt-5-mini'
  maxSteps?: number
}

type CodeAnalysisSubTaskInput = {
  codeAnalysisContext: VibeCheckContext
  codeAnalysisOptions?: AnalyzeAgentOptions['options']
}

type CliAuditSubTaskInput = {
  targetUrl: string
  codeAnalysisContext: VibeCheckContext
  codeAnalysisOptions?: AnalyzeAgentOptions['options']
}
```

**Sub-task return type:**

```typescript
type SecurityAuditSubTaskOutput = {
  checks: z.infer<typeof securityAuditCheckItemSchema>[]
  sessionId: string | null // For browser audits
  sessionRecordingUrl: string | null // For browser audits
  error: string | null // If task failed
}
```

### 3. Refactor Parent Task ✅

Update `apps/trigger/src/tasks/security-audit/run.ts` to:

1. ✅ **Remove direct agent calls** - No longer calls `runSecurityAudit()` or individual agents
2. ✅ **Determine which sub-tasks to run** based on:

- ✅ `targetUrl` presence → browser audits + CLI audit
- ⚠️ `codeAnalysisContext` presence → code analysis audits + CLI audit (context setup still TODO)

3. ✅ **Spawn sub-tasks** using `tasks.batchTriggerAndWait()`:

   ```typescript
   const { runs } = await tasks.batchTriggerAndWait([
     {
       task: browserTransportTask,
       payload: { targetUrl, userApiKey, modelName },
     },
     {
       task: browserHeadersTask,
       payload: { targetUrl, userApiKey, modelName },
     },
     // ... etc
   ])
   ```

4. ✅ **Aggregate results** from all completed sub-tasks:

- ✅ Collect all checks from successful runs
- ✅ Collect session IDs and recording URLs
- ✅ Handle failed sub-tasks (log errors, continue with successful ones)

5. ✅ **Calculate metrics**:

- ✅ Score: `(passedChecks / totalChecks) * 100`
- ✅ Critical issues: checks with status='fail' and severity='critical' or 'high'
- ✅ Recommendations: unique recommendations from failed/warning checks

6. ✅ **Save to database** - Update `securityAuditRuns` with aggregated results

### 4. Format Conversion Logic ✅

Each sub-task needs to convert agent output to `securityAuditCheckItemSchema`:**Browser audits** (already have `checks` array):

- ✅ Add: `method: 'Browser automation'`, `tool: 'Browserbase/Stagehand'`, `date: ISO string`
- ✅ Map status to severity: fail → 'high', warning → 'medium', pass → 'low'
- ✅ Keep: category, check, status, details, recommendation

**Code analysis audits** (have `findings` array):

- ✅ Convert each finding to a check:
- ✅ `category`: Based on agent type ('Backend Security', 'Frontend Security', etc.)
- ✅ `check`: `finding.message`
- ✅ `status`: severity === 'critical'|'high' → 'fail', 'medium' → 'warning', else → 'pass'
- ✅ `method`: 'Static code analysis'
- ✅ `tool`: 'AI code review' (or finding.tool if available)
- ✅ `severity`: `finding.severity`
- ✅ `details`: `finding.path`
- ✅ `recommendation`: `finding.suggestion`

**CLI audit** (already has `checks` array):

- ✅ Add: `date: ISO string`
- ✅ Keep all other fields as-is

### 5. Error Handling ✅

- ✅ **Sub-task failures**: Log error, return empty checks array, continue with other sub-tasks
- ✅ **Partial failures**: Parent task aggregates successful results, marks run as 'completed' with partial results
- ✅ **Complete failure**: If all sub-tasks fail, mark run as 'failed' with error message

### 6. Browser Session Management ✅

Each browser audit sub-task:

- ✅ Creates its own Stagehand instance
- ✅ Initializes browser session
- ✅ Runs agent
- ✅ Closes browser session in finally block
- ✅ Returns sessionId and sessionRecordingUrl in output

This ensures:

- ✅ No session conflicts between parallel browser audits
- ✅ Each audit has its own recording
- ✅ Sessions are properly cleaned up

### 7. Code Analysis Context Setup ⚠️

For code analysis sub-tasks, the parent task needs to:

- ⚠️ Check if `audit.repoId` exists (TODO: lines 76-101 in run.ts)
- ⚠️ If yes, set up `codeAnalysisContext` (clone repo, create VibeCheckContext) - **NOT IMPLEMENTED**
- ✅ Pass context to code analysis sub-tasks (structure ready, but context is null)
- ⚠️ This addresses the TODO on line 126 of the current implementation - **STILL TODO**

## Files to Create ✅

1. ✅ `apps/trigger/src/tasks/security-audit/browser-transport.ts`
2. ✅ `apps/trigger/src/tasks/security-audit/browser-headers.ts`
3. ✅ `apps/trigger/src/tasks/security-audit/browser-cookies.ts`
4. ✅ `apps/trigger/src/tasks/security-audit/browser-storage.ts`
5. ✅ `apps/trigger/src/tasks/security-audit/browser-console.ts`
6. ✅ `apps/trigger/src/tasks/security-audit/code-backend.ts`
7. ✅ `apps/trigger/src/tasks/security-audit/code-frontend.ts`
8. ✅ `apps/trigger/src/tasks/security-audit/code-database.ts`
9. ✅ `apps/trigger/src/tasks/security-audit/code-infrastructure.ts`
10. ✅ `apps/trigger/src/tasks/security-audit/code-dependency.ts`
11. ✅ `apps/trigger/src/tasks/security-audit/cli-audit.ts`

## Files to Modify ✅

1. ✅ `apps/trigger/src/tasks/security-audit/run.ts` - Refactor to orchestrate sub-tasks

## Dependencies ✅

- ✅ Import agent functions from `@app/agents`
- ✅ Import schemas from `@app/agents` (securityAuditCheckItemSchema)
- ✅ Use `tasks.batchTriggerAndWait()` from `@trigger.dev/sdk`
- ✅ Browser audits need Stagehand setup (already in current code)
- ⚠️ Code analysis needs VibeCheckContext setup (needs to be implemented - TODO in run.ts)

## Notes

- The current `runSecurityAudit()` orchestrator in `packages/agents/src/agents/security-audit.ts` can remain for backward compatibility or be deprecated later
- Sub-tasks are independent and can be retried individually if needed
