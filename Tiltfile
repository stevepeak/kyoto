load('ext://uibutton', 'cmd_button', 'choice_input', 'location', 'text_input', 'bool_input')
load('ext://dotenv', 'dotenv')

# Load environment variables from .env file in project root
dotenv()

local_resource(
    name='Web',
    labels=["Apps"],
    serve_cmd="bun --cwd apps/web2 dev",
    links=[
        link("http://localhost:3002/", "Web"),
    ],
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
    serve_cmd="bun run --cwd packages/db2 db:studio",
)

local_resource(
    name='Storybook',
    labels=["Development"],
    serve_cmd="bun run --cwd apps/web2 storybook",
    links=[
        link("http://localhost:6006/", "Storybook"),
    ],
)

# local_resource(
#     name='Docs',
#     labels=["Apps"],
#     serve_cmd="cd apps/docs && mint dev --port 3002",
#     links=[ link("http://localhost:3002", "Docs") ],
# )
