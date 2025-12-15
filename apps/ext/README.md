# Kyoto VS Code Extension

A VS Code extension for Kyoto with Vibe Checks and Vibe Tests panels.

## How to open

1. Open new Cursor client in the workspace `apps/ext`
2. Show the **Run & Debug** tab ⌘+shift+D
3. **Run Extension** should be selected. Click **Run** button
4. Choose Kyoto workspace. You will see the kyoto tab

## Development

```bash
# Install dependencies
bun install

# Compile
bun run compile

# Watch mode
bun run watch
```

## Testing

1. Open this folder in VS Code
2. Press `F5` to launch the Extension Development Host
3. The Kyoto icon should appear in the Activity Bar (left sidebar)
