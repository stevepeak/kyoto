# Work

# CLI Changes
- [ ] remove cli commands
  - dedupe
  - organize
  - vibe
  - wiki



# New Flow
- [ ] We still need the composition step because people can write their own stories

## Move tools
- [x] move tools into each specific domain
  - [x] packages/daytona
  - [x] packages/shell

- [ ] add --json to `kyoto discover` ???

- [ ] construct the tools into each domain (apps/cli apps/trigger)



dont pass Ora. pass context 
export function createLocalCreateDirectoryTool(ora?: Ora) {

# Move agents




-------



## CI

Kyoto CI needs to
- install the kyoto CLI 
- pull all stories into the .kyoto directory 
- inject the token
- then run appropriate tests

how do we know which tests to run? the CLI should also have some cache awareness in the .kyoto folder therefore the cache should be injected into the sandbox as well