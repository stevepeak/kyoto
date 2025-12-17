# Cole

- kyoto puts github comments w/ new/changed/removed stories
- Kyoto will eventurally replace Linear/Jira/etc. because it has
  real recordings, annotation of code, and directly related
  to user facing functionality.

# Notes

- vscode extension for viewing tests
  - and vibe checks
- 1 headless per agent
- `kyoto vibe prompt`
  - what do you want to build
  - gather context
  - what do i need
- `kyoto vibe check --all` for looking over entire code base

---- Focus on kyoto MCP because Swatantra

in the @apps/web/components/display/terminal-player.stories.tsx

VM2633:1 Uncaught (in promise) SyntaxError: Bad escaped character in JSON at position 11 (line 1 column 12)
at parse (<anonymous>)
at asciinema-player.js?v=6e761797:574:12
at asciinema-player.js?v=a6e761797:589:9
at Object.step (asciinema-player.js?v=6e761797:611:9)
at Object.next (asciinema-player.js?v=6e761797:550:16)
at Array.from (<anonymous>)
at \_Stream.toArray (asciinema-player.js?v=6e761797:532:18)
at prepare (asciinema-player.js?v=6e761797:1349:19)
at loadRecording (asciinema-player.js?v=6e761797:888:24)
at async Object.init (asciinema-player.js?v=6e761797:870:18)

﻿

---

browser-agents-page.tsx:245
GET http://localhost:3000/api/trpc/browserAgents.getRecording?batch=1&input=%7B…%22%3A%7B%22runId%22%3A%22ffb29231-c50a-4b06-a301-49b64899d5cd%22%7D%7D%7D 500 (Internal Server Error)

﻿
