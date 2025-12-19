# Update Documentation & Branding

When updating branding, messaging, or feature documentation for Kyoto, use this guide to ensure all locations are updated consistently.

## Branding

### Product Name & Visual Identity

**Product Name: "Kyoto"**

- `README.md` - Main README with ASCII art logo
- `apps/cli/README.md` - CLI package README (duplicate of main)
- `apps/web/app/layout.tsx` - Page title and metadata
- `apps/web/app/page.tsx` - Page metadata description
- `apps/docs/docs.json` - Documentation site name and logo paths
- `apps/cli/src/cli.tsx` - CLI program name
- `apps/cli/src/commands/mcp/index.tsx` - MCP server name
- `apps/cli/package.json` - Package name `@usekyoto/cli` and description
- `apps/web/components/pages/dashboard-page.tsx` - Landing page branding

**ASCII Art Logo (入京行改善)**

- `README.md` - Lines 1-9
- `apps/cli/README.md` - Lines 1-9
- `apps/cli/src/ui/jumbo.tsx` - CLI banner display
- `apps/docs/pages/quickstart.mdx` - Lines 6-19
- `apps/web/components/pages/dashboard-page.tsx` - Kanji component usage
- `apps/cli/src/ui/footer.tsx` - Footer with red 入 character

**Logo Files**

- `apps/docs/public/kyoto-logo-dark.png` - Dark mode logo
- `apps/docs/public/kyoto-logo-light.png` - Light mode logo
- `apps/web/public/kyoto-logo.png` - Web app logo

**Taglines & Slogans**

- "May the vibe be with you." - `apps/cli/src/ui/jumbo.tsx` (vibePhrases array)
- "Vibe coding tools for the developers of tomorrow." - `apps/web/app/layout.tsx`, `apps/web/components/pages/dashboard-page.tsx`
- "Enter `入` Kyoto `京`, it takes action `行` that continuously improves `改善`" - `README.md`, `apps/cli/README.md`

**Color Scheme**

- Primary red color: `#ff0000` - `apps/docs/docs.json`
- Red character styling: Used in multiple components for 入 character

## Messaging

### Value Propositions

**Main Value Prop: "Vibe coding comes with risks"**

- `README.md` - Line 11
- `apps/cli/README.md` - Line 11
- `apps/docs/pages/features/vibe.mdx` - Lines 6-9

**Product Description**

- "Kyoto will vibe check your code to ensure it remains in good shape to promote your rapid development." - `README.md`, `apps/cli/README.md`
- "Kyoto MCP empowers your AI agents to evaluate and improve their vibe coding; enabling faster, higher-quality iteration and more productive outcomes." - `apps/mcp/README.md`, `apps/docs/pages/integrations/mcp.mdx`

**Attribution & Credits**

- "Made with intention by the creators of Codecov - @iopeak" - `README.md`, `apps/cli/README.md`
- "Inspired and initially demoed at Hacker Residency Group in Da Nang, Vietnam 2025." - `apps/web/components/pages/dashboard-page.tsx`, `apps/docs/pages/quickstart.mdx`
- "Kyoto is open source by @iopeak (Founder of Codecov)" - `apps/web/components/pages/dashboard-page.tsx`

**Social Links**

- GitHub: `https://github.com/stevepeak/kyoto` - Multiple locations
- Twitter/X: `https://x.com/iopeak` - Multiple locations
- Documentation: `https://docs.usekyoto.com` - `apps/web/components/pages/dashboard-page.tsx`
- Website: `https://usekyoto.com` - `apps/cli/src/ui/footer.tsx`

### Feature Descriptions

**Vibe Check**

- "Check code for various issues before committing to github" - `apps/cli/src/commands/register.tsx`
- "Run several agents to ensure your code is in good shape" - `apps/cli/src/commands/help/index.tsx`
- Full feature docs: `apps/docs/pages/features/vibe.mdx`

**Commit**

- "Plan and commit uncommitted changes into logical commits" - `apps/cli/src/commands/register.tsx`
- "Use Kyoto AI to commit unstaged changes into logical commits" - `apps/cli/src/commands/help/index.tsx`
- Full feature docs: `apps/docs/pages/features/commit.mdx`

**MCP**

- "MCP command" - `apps/cli/src/commands/register.tsx`
- "Add Kyoto to your MCP services" - `apps/cli/src/commands/register.tsx` (setup mcp)
- Full integration docs: `apps/docs/pages/integrations/mcp.mdx`, `apps/mcp/README.md`

**Diff**

- "Analyze and summarize staged and unstaged git changes" - `apps/cli/src/commands/register.tsx`
- Full feature docs: `apps/docs/pages/features/diff.mdx`

**Test**

- "Interactive browser testing with AI agent" - `apps/cli/src/commands/register.tsx`
- "Continuous testing with browser" - `apps/cli/src/commands/help/index.tsx`
- Full feature docs: `apps/docs/pages/features/test.mdx`

## Features

### CLI Commands

**Command Definitions** - `apps/cli/src/commands/register.tsx`

- All command descriptions and options are defined here
- Commands: `setup`, `login`, `mcp`, `commit`, `plan`, `docs`, `diff`, `vibe check`, `vibe test`

**Command Help Text** - `apps/cli/src/commands/help/index.tsx`

- Interactive help display with examples
- Organized by groups: Vibing, Tooling, Configuring
- Each command has description and example usage

**Command README Documentation** - `README.md`, `apps/cli/README.md`

- Setup commands section
- Login section
- Vibe Check section
- Commit section
- MCP section
- Plan section
- Docs section

### Documentation Site

**Main Pages** - `apps/docs/pages/`

- `quickstart.mdx` - Getting started guide
- `roadmap.mdx` - Product roadmap
- `features/vibe.mdx` - Vibe check feature
- `features/commit.mdx` - Commit feature
- `features/diff.mdx` - Diff feature
- `features/test.mdx` - Test feature
- `integrations/mcp.mdx` - MCP integration
- `integrations/github.mdx` - GitHub integration

**Docs Configuration** - `apps/docs/docs.json`

- Site name, logo, colors
- Navigation structure
- Footer social links

### Web App

**Landing Page** - `apps/web/components/pages/dashboard-page.tsx`

- Main hero section with tagline
- Feature cards (CLI, User story testing, Git template)
- Attribution and credits

**Page Metadata** - `apps/web/app/page.tsx`, `apps/web/app/layout.tsx`

- SEO titles and descriptions

### MCP Integration

**MCP Server** - `apps/cli/src/commands/mcp/index.tsx`

- Server name and version
- Tool descriptions for each agent
- MCP tool registration

**MCP Setup** - `apps/cli/src/commands/init/mcp-setup.ts`

- Setup instructions and rule file content

**MCP Documentation**

- `apps/mcp/README.md` - MCP package README
- `apps/docs/pages/integrations/mcp.mdx` - Integration docs

### Package Metadata

**CLI Package** - `apps/cli/package.json`

- Package name: `@usekyoto/cli`
- Description: "Kyoto"
- Keywords: ai, vibe-coding, vibe-check, development-tools, etc.

## Update Checklist

When updating branding/messaging/features, check these locations:

### For Product Name Changes:

- [ ] `README.md`
- [ ] `apps/cli/README.md`
- [ ] `apps/web/app/layout.tsx`
- [ ] `apps/web/app/page.tsx`
- [ ] `apps/docs/docs.json`
- [ ] `apps/cli/src/cli.tsx`
- [ ] `apps/cli/src/commands/mcp/index.tsx`
- [ ] `apps/cli/package.json`
- [ ] `apps/web/components/pages/dashboard-page.tsx`

### For Tagline/Slogan Changes:

- [ ] `apps/cli/src/ui/jumbo.tsx` (vibePhrases array)
- [ ] `apps/web/app/layout.tsx`
- [ ] `apps/web/components/pages/dashboard-page.tsx`
- [ ] `README.md`
- [ ] `apps/cli/README.md`

### For Value Proposition Changes:

- [ ] `README.md`
- [ ] `apps/cli/README.md`
- [ ] `apps/docs/pages/features/vibe.mdx`
- [ ] `apps/mcp/README.md`
- [ ] `apps/docs/pages/integrations/mcp.mdx`

### For Command Documentation:

- [ ] `apps/cli/src/commands/register.tsx` (command descriptions)
- [ ] `apps/cli/src/commands/help/index.tsx` (help text)
- [ ] `README.md` (command sections)
- [ ] `apps/cli/README.md` (command sections)
- [ ] `apps/docs/pages/features/*.mdx` (feature-specific docs)
- [ ] `apps/docs/pages/integrations/*.mdx` (integration docs)

### For Feature Additions/Changes:

- [ ] `apps/cli/src/commands/register.tsx` (register new command)
- [ ] `apps/cli/src/commands/help/index.tsx` (add to help)
- [ ] `README.md` (add command section)
- [ ] `apps/cli/README.md` (add command section)
- [ ] `apps/docs/pages/features/*.mdx` (create/update feature doc)
- [ ] `apps/docs/docs.json` (add to navigation if needed)

### For Attribution/Credits:

- [ ] `README.md`
- [ ] `apps/cli/README.md`
- [ ] `apps/web/components/pages/dashboard-page.tsx`
- [ ] `apps/docs/pages/quickstart.mdx`

## Example: Updating "kyoto setup mcp" Documentation

If updating the `kyoto setup mcp` command documentation, check:

1. **Command Definition**: `apps/cli/src/commands/register.tsx` (line 34)
2. **Help Text**: `apps/cli/src/commands/help/index.tsx` (if visible in help)
3. **README**: `README.md` (line 27), `apps/cli/README.md` (line 27)
4. **Integration Docs**: `apps/docs/pages/integrations/mcp.mdx` (lines 13-15, 21-58)
5. **MCP README**: `apps/mcp/README.md` (lines 20-27)
6. **Setup Implementation**: `apps/cli/src/commands/init/mcp-setup.ts`
7. **Web Landing Page**: `apps/web/components/pages/dashboard-page.tsx` (if mentioned)

## Tips

- Use semantic search to find all occurrences of specific phrases
- Check both the source code and documentation files
- Remember that `apps/cli/README.md` is often a duplicate of the main `README.md`
- The CLI help text (`apps/cli/src/commands/help/index.tsx`) may have different wording than the README
- Documentation site pages (`apps/docs/pages/*.mdx`) may have more detailed explanations than README files
