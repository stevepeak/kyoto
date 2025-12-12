```sh
入   |
京   |
行   |   Kyoto
改   |
善   |
```

> Enter `入` Kyoto `京`, it takes action `行` that continuously improves `改善`

**_Vibe coding comes with risks_**. Entropy can quickly creep into your codebase bringing your development flow to a grinding halt. Sloppy AI code, security issues, bugs, dead code, and duplicate functions are all avoidable. Kyoto will vibe check your code to ensure it remains in good shape to promote your rapid development.

1. **Setup** Kyoto with `kyoto setup ai` to configure your AI provider and API key
2. **Check** your changes with `kyoto vibe check` to test and diff user stories against staged changes
3. **Commit** intelligently with `kyoto commit` to analyze uncommitted changes and organize them into logical commits
4. **Plan** your work with `kyoto plan` to view the current plan
5. **Documentation** is available via `kyoto docs`

## Commands

### Setup

Setup commands (currently hidden from `--help`, but available):

- `kyoto setup` - Setup commands
- `kyoto setup ai` - Configure your AI provider and API key
- `kyoto setup mcp` - Add Kyoto to your MCP services
- `kyoto setup github` - Add a GitHub Action for Kyoto

### Login

Login via browser using GitHub OAuth:

- `kyoto login`

### Vibe Check

Check code for various issues before commiting to github.

- `kyoto vibe check` - Check all changes
- `kyoto vibe check --staged` - Only check staged changes
- `kyoto vibe check --timeout <minutes>` - Set timeout for each agent in minutes (default: 1)

### Commit

Analyze uncommitted changes and organize them into logical commits:

- `kyoto commit` - Plan and commit uncommitted changes into logical commits
- `kyoto commit [instructions]` - Provide optional instructions to guide grouping and commit messages
- `kyoto commit --plan` - Generate and save a commit plan to `.kyoto/commit-plan.json` without committing

### MCP

MCP command:

- `kyoto mcp`

### Plan

View the current plan:

- `kyoto plan`

### Docs

View the Kyoto documentation:

- `kyoto docs`

## Crafted with Intention

Made with intention by the creators of [Codecov](https://codecov.io) - [@iopeak](https://x.com/iopeak)

---

For setup and development instructions, see [SETUP.md](./SETUP.md).
