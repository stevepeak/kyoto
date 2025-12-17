load('ext://uibutton', 'cmd_button', 'choice_input', 'location', 'text_input', 'bool_input')
load('ext://dotenv', 'dotenv')

# Load environment variables from .env file in project root
dotenv()

local_resource(
    name='Web',
    labels=["Apps"],
    serve_cmd="bun --cwd apps/web dev",
    links=[ link("http://localhost:3000/", "Web") ],
)
cmd_button(
    name="btn-web-kill",
    resource="Web",
    icon_name="terminal",
    text="Kill Port",
    argv=["sh", "-c", "lsof -i :3000 -t | xargs kill"],
)


local_resource(
    name='Trigger',
    labels=["Apps"],
    serve_cmd="bun run --cwd apps/trigger dev",
    links=[ link("https://cloud.trigger.dev/orgs/tailz-5e0b/projects/tailz-uBK2/env/dev/runs", "Trigger") ],
)

# Apps => Firebase
local_resource(
    name='Docs',
    labels=["Apps"],
    serve_cmd="cd apps/docs && mint dev --port 3001",
    links=[ link("http://localhost:3001", "Docs") ],
)

cmd_button(
    name="btn-docs-kill",
    resource="Docs",
    icon_name="terminal",
    text="Kill Port",
    argv=["sh", "-c", "lsof -i :3001 | awk 'NR>1 {print $2}' | xargs kill"],
)

# Development => MCP Builder
local_resource(
    labels=["Development"],
    name='MCP Builder',
    serve_cmd="bunx @modelcontextprotocol/inspector ~/.bun/bin/kyoto mcp",
)
cmd_button(
    name="btn-mcp-kill",
    resource="MCP Builder",
    icon_name="terminal",
    text="Kill Port",
    argv=["sh", "-c", "lsof -i :6274 -t | xargs kill"],
)

local_resource(
    name='Drizzle Studio',
    labels=["Development"],
    serve_cmd="bun run --cwd packages/db db:studio",
    links=[link("https://local.drizzle.studio", "Drizzle Studio") ],
)

local_resource(
    name='Storybook',
    labels=["Development"],
    serve_cmd="bun run --cwd apps/web storybook",
    links=[ link("http://localhost:6006/", "Storybook") ],
)
cmd_button(
    name="btn-storybook-kill",
    resource="Storybook",
    icon_name="terminal",
    text="Kill Port",
    argv=["sh", "-c", "lsof -i :6006 -t | xargs kill"],
)
