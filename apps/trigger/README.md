# Workflows App

This app contains Trigger.dev workflows for the application.

## Setup

1. **Install dependencies:**

   ```bash
   bun install
   ```

2. **Set up Trigger.dev authentication:**
   - Get your `TRIGGER_SECRET_KEY` from the Trigger.dev dashboard
   - Add it to your `.env` file:
     ```
     TRIGGER_SECRET_KEY=tr_dev_xxxxxxxxxx
     ```

3. **Run the workflow server locally:**

   ```bash
   bun --filter @app/workflows dev
   ```

   Or run it as part of the main dev command:

   ```bash
   bun dev
   ```

   This starts the Trigger.dev development server which will:
   - Watch for changes in workflow files
   - Execute workflows when triggered
   - Provide logging and observability

## Workflows

- **execute-run**: Main workflow that orchestrates:
  - Repository analysis
  - Story testing
  - GitHub status updates

## Development

Workflows are defined in `src/run-workflow.ts`. When you make changes, the Trigger.dev dev server will automatically reload.

To trigger a workflow from the API, use:

```typescript
import { tasks } from '@trigger.dev/sdk'
await tasks.trigger('execute-run', payload)
```
