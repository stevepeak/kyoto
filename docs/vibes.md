# kyoto vibes updates

## during processCommit
this should return an object of 
{
  text: string,
  stories: {
    filePath: string,
    scopeOverlap: 'significant' | 'moderate' | 'low',
    reasoning: string
  }[],
}

### Before diff-evaluatior

**Deterministic**
- [ ] check if any TS changed (if none, return {text: 'No relevant files changed', stories: []})
- [ ] then based off the TS file changes
  - if any lines are relevant to the evidence: add them to the "stories[]" array

**AI**
- diff-evaluator flow
  - [ ] system prompt instructions are given this commit you must determine
    if any user stories are impacted by this commit
  - [ ] add the following tools:
    - semantic searching stories
    - terminal command (use for getting the git diff)
    - read file
  - return a list (same strucutre above)

### Finally
after the spinner is succeed
list the stories that are impacted 

