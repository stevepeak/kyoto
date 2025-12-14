# Test Command

Browser testing command with file watching and AI-powered test suggestions.

## Stages

The test command operates through a state machine with the following stages:

| Stage                 | Type             | Description                                                                                                 |
| --------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------- |
| **1. Initializing**   | `initializing`   | Shows spinner with optional text (e.g., "Starting..."). Used during browser/agent startup.                  |
| **2. Waiting**        | `waiting`        | Shows "👀 Watching for changes..." with exit instructions. File watcher is active.                          |
| **3. Evaluating**     | `evaluating`     | Shows spinner with "Analyzing changes...". Triggered when files change; AI evaluates what tests to suggest. |
| **4. Awaiting Input** | `awaiting-input` | Displays `TestPlanSelector` UI for user to pick tests. Contains `tests: BrowserTestSuggestion[]`.           |
| **5. Executing**      | `executing`      | Shows spinner with "Running tests..." and a list of tests with their statuses.                              |

### Stage Flow

```
┌──────────────┐
│ initializing │
└──────┬───────┘
       │ browser ready
       ▼
┌──────────────┐
│   waiting    │◄─────────────────────┐
└──────┬───────┘                      │
       │ files changed                │
       ▼                              │
┌──────────────┐                      │
│  evaluating  │                      │
└──────┬───────┘                      │
       │ tests suggested              │
       ▼                              │
┌───────────────────┐                 │
│  awaiting-input   │                 │
└──────┬────────────┘                 │
       │ user submits                 │
       ▼                              │
┌──────────────┐                      │
│  executing   │──────────────────────┘
└──────────────┘  tests complete
```

## Components

### `index.tsx`

Main component orchestrating all hooks and rendering.

### `stage-indicator.tsx`

Renders the current stage status (spinner, waiting message, test progress).

### `stream-display.tsx`

Renders accumulated log items (logs, agent messages, test results, dividers).

### `test-plan-selector.tsx`

Interactive UI for selecting which tests to run during `awaiting-input` stage.

## Hooks

### `use-browser-agent.ts`

Manages browser agent lifecycle (initialization, cleanup).

### `use-evaluation.ts`

Handles file change evaluation and test suggestion generation.

### `use-file-watcher.ts`

Watches for file changes with debouncing.

### `use-stream.ts`

Manages the stream of log items.

### `use-test-execution.ts`

Handles running selected tests and reporting results.

## Types

### `Stage`

Discriminated union representing the current stage state.

### `StreamItem`

Union type for log entries: `log`, `agent`, `test-result`, `divider`.

### `TestStatus`

Status of individual tests: `pending`, `selected`, `running`, `pass`, `fail`.
