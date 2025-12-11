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
# Build for production
bun run build

# Preview production build
bun run start
```

## Structure

- `mint.json` - Mintlify configuration
- `docs/` - Documentation markdown files
- `public/` - Static assets (logos, images, etc.)

## Adding Content

1. Create markdown files in `docs/`
2. Add navigation entries in `mint.json`
3. Use MDX for React components if needed
