<div align="center">

# ——— <span style="color: red; font-size: 1.5em;">入</span> <span style="font-size: 1.5em;">Kyoto</span> <span style="color: grey; font-size: 1.5em;">MCP</span> ———

</div>

<div align="center">

[![Uneed.best](https://img.shields.io/badge/Uneed.best-Recommended-brightgreen?style=for-the-badge)](https://uneed.best)
[![Product Hunt](https://img.shields.io/badge/Product%20Hunt-Upvote-orange?style=for-the-badge&logo=product-hunt)](https://www.producthunt.com)

</div>

Kyoto MCP empowers your AI agents to evaluate and improve their vibe coding; enabling faster, higher-quality iteration and more productive outcomes.

## Quick Setup

Run the command below to automatically setup the MCP integration in your IDE:

```sh
kyoto setup mcp
```

This command will:

- Register Kyoto's MCP server in `.cursor/mcp.json`
- Create a rule file at `.cursor/rules/kyoto.mdc` for automatic vibe checking

## Manual Setup

If you prefer to set up manually, follow these steps:

### 1. Register Kyoto's MCP

Add the following configuration to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "kyoto": {
      "command": "kyoto",
      "args": ["mcp", "--cwd", "${workspaceFolder}"]
    }
  }
}
```

### 2. Add Agent Rules

Create a rule file at `.cursor/rules/kyoto.mdc`:

```md
---
description: Kyoto MCP rules for vibe checking AI code
alwaysApply: true
---

Use the Kyoto MCP tool once your work is complete to ensure it aligns with best coding practices.
```

## Tools

Kyoto MCP provides the following tools for code review and quality checking:

### `code-review`

Run all code review agents on unstaged changes. This comprehensive tool executes all individual agents in parallel and returns a combined summary of findings.

### Individual Agent Tools

#### `bug-detection`

Detect bugs, logic errors, and potential runtime issues within the scope.

#### `code-organization`

Find functions and components that should be moved to other packages or extracted into helper functions to reduce file sizes.

#### `function-consolidation`

Highlight opportunities to merge or extract shared helpers from similar functions.

#### `library-usage`

Check library usage against documentation to ensure best practices and avoid reinventing the wheel.

#### `secret-detection`

Scan code changes for leaked secrets, API keys, passwords, and other sensitive information.

#### `stale-code-detection`

Detect unused code that was added in scope or became unreachable due to changes.

### `browser-test`

Run browser tests on code changes using an AI agent. Analyzes changes, generates test suggestions, and executes them automatically in a browser.

## Usage Tips

- Use the `code-review` tool to run all checks at once, or call individual agent tools for specific analysis
- All tools analyze unstaged changes by default
- Results include severity levels: `error`, `bug`, `high`, `warn`, and `info`
- Use `browser-test` to automatically test UI changes with an AI agent that can interact with your browser
