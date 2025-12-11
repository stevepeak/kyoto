```sh
入   |
京   |
行   |   Kyoto
改   |
善   |
```

> Enter `入` Kyoto `京`, it takes action `行` that continuously improves `改善`

**Kyoto is testing in the age of vibe.** Our goal is to monitor, write, test, maintain, and ensure
your user functionalities remain working.

1. **Setup** Kyoto with `kyoto setup` to configure your AI provider and API key
2. **Check** your changes with `kyoto vibe check` to test and diff user stories against staged changes
3. **Commit** intelligently with `kyoto commit` to analyze uncommitted changes and organize them into logical commits
4. **Plan** your work with `kyoto plan` to view the current plan
5. **Documentation** is available via `kyoto docs`

## Commands

### Vibe Check

Test and diff user stories against your changes:

- `kyoto vibe check` - Check all changes
- `kyoto vibe check --staged` - Only check staged changes
- `kyoto vibe check --timeout <minutes>` - Set timeout for each agent in minutes (default: 1)

### Commit

Analyze uncommitted changes and organize them into logical commits:

- `kyoto commit` - Analyze and suggest commit organization (dry-run by default)
- `kyoto commit --dry-run` - Explicitly run in dry-run mode (default behavior)

## Crafted with Intention

Made with intention by the creators of [Codecov](https://codecov.io) - [@iopeak](https://x.com/iopeak)

---

For setup and development instructions, see [SETUP.md](./SETUP.md).
