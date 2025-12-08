load('ext://uibutton', 'cmd_button', 'choice_input', 'location', 'text_input', 'bool_input')
load('ext://dotenv', 'dotenv')

# Load environment variables from .env file in project root
dotenv()

local_resource(
    name='Web',
    labels=["Apps"],
    serve_cmd="bun --cwd apps/web dev",
    links=[ link("http://localhost:3002/", "Web") ],
)

local_resource(
    name='Trigger',
    labels=["Apps"],
    serve_cmd="bun run --cwd apps/trigger dev",
    links=[ link("https://cloud.trigger.dev/orgs/tailz-5e0b/projects/tailz-uBK2/env/dev/runs", "Trigger") ],
)

# Development => MCP Builder
local_resource(
    labels=["Development"],
    name='MCP Builder',
    auto_init=False,
    serve_cmd="npx @modelcontextprotocol/inspector",
    # ! cannot show link, must get from logs w/ token
    # links=[ link("http://localhost:6274", "MCP Inspector") ],
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

# local_resource(
#     name='Docs',
#     labels=["Apps"],
#     serve_cmd="cd apps/docs && mint dev --port 3002",
#     links=[ link("http://localhost:3002", "Docs") ],
# )
