> **ACTIVE DEVELOPMENT** Not yet released. But I'm building in public.

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

1. **Write** user stories with `kyoto craft`
2. (optional) **Develop** the feature with `kyoto create --using cursor`
3. **Test** stories via `kyoto test`, or ...

- `kyoto test --only browser` for browser simulation testing
- `kyoto test --only mobile` for mobile simulation testing
- `kyoto test --only tui` for terminal/cli simluation testing
- `kyoto test --only trace` for ai deep-trace testing

4. **Continiously** in GitHub Actions with `kyoto setup github`
5. **Inquire** with "DeepWiki but for user stories" with `kyoto wiki`

## Vibe Coding

Kyoto works best with vibe coding. Enter `kyoto vibe`.

```sh
入   |
京   |
行   |   Kyoto is watching file changes ...
改   |
善   |
```

Then you may add a new feature and ...

```sh
か   |  + Customers can now rename their lists.
```

Or you may change one...

```sh
変   |  ~ Customer must add item before checkout button is visible.
```

Or remove a feature...

```sh
削   |  - No longer can a customer share their cart.
```

Or refactor a feature making sure it works

```sh
通   |  √ Passed: users can login
通   |  √ Passed: users can create a new list
```

## MCP

Kyoto MCP helps your IDE understand user stories.

```json
{
  "mcpServers": {
    "Kyoto": {
      "command": "npx",
      "args": ["kyoto", "mcp"]
    }
  }
}
```

Then in a `.cursor/rules/...` add

```
Always use `kyoto` mcp to explore user stories and behaviors.
```

## Mission

In the age of AI, many developers are vibe coding and not writing tests. We don't blame them. Instead, let's craft user stories and let AI review, simulate and test to ensure the functionality works as expected.

## Crafted with Intention

Made with intention by the creators of [Codecov](https://codecov.io) - [@iopeak](https://x.com/iopeak)

---

For setup and development instructions, see [SETUP.md](./SETUP.md).
