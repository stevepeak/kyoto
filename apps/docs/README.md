# Kyoto Documentation

This is the Mintlify documentation site for Kyoto.

## Development

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

The docs will be available at `http://localhost:3000`.

## Building

```bash
# Validate docs (broken internal links, etc.)
bun run build

# Run local preview server (same as dev, but doesn't auto-open the browser)
bun run start
```

## Structure

- `docs.json` - Mintlify configuration
- `pages/` - Documentation MDX files
- `public/` - Static assets (logos, images, etc.)

## Adding Content

1. Create MDX files in `pages/`
2. Add navigation entries in `docs.json`
3. Use MDX for React components if needed
