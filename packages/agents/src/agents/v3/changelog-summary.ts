import { Experimental_Agent as Agent, Output } from 'ai'
import type { LanguageModel } from 'ai'
import { dedent } from 'ts-dedent'
import { z } from 'zod'

import { agents } from '../..'
import type { Commit } from '@app/schemas'

interface GenerateChangelogSummaryOptions {
  repoSlug: string
  commit: Commit
  model?: LanguageModel
}

/**
 * Agent to generate a markdown changelog from commit messages and code changes
 * Groups changes into user-facing functionalities, functionality, and technical changes
 */
export async function generateChangelogSummary({
  repoSlug,
  commit,
  model: providedModel,
}: GenerateChangelogSummaryOptions): Promise<string> {
  const model = providedModel ?? agents.discovery.options.model

  const agent = new Agent({
    model,
    system: dedent`
      You are an expert code analyst and product manager tasked with generating a comprehensive changelog from commit messages and code changes.

      # Your Task
      Analyze the provided commit messages and code diff to create a well-structured markdown changelog that groups changes into meaningful categories.

      # Changelog Structure
      Organize the changelog using markdown headers and lists. Group changes into these categories:

      1. **User-Facing Functionalities**: Changes that directly impact end users or customers
         - New features visible to users
         - UI/UX improvements
         - User workflow changes
         - Customer-facing API changes
         - Changes to user-visible behavior

      2. **Functionality**: Changes that add or modify functionality but may not be directly user-visible
         - New internal features
         - Feature enhancements
         - Business logic changes
         - Workflow improvements
         - Integration additions

      3. **Technical Changes**: Infrastructure, architecture, and code quality improvements
         - Refactoring
         - Performance optimizations
         - Dependency updates
         - Configuration changes
         - Code quality improvements
         - Build/deployment changes
         - Developer experience improvements

      # Formatting Guidelines
      - Use markdown headers (##) for each category
      - Use bullet points (-) for individual changes
      - Be specific and descriptive for each change
      - Group related changes together when appropriate
      - Focus on what changed, not just that something changed
      - If no changes exist in a category, omit that section entirely
      - Write in clear, concise language suitable for stakeholders

      # Output
      Return a complete markdown changelog document. Start with a brief summary if helpful, then organize changes by category. Make it readable and useful for both technical and non-technical stakeholders.
    `,
    experimental_output: Output.text(),
  })

  const prompt = dedent`
    Generate a changelog for these commits and code changes:

    ## Repository
    ${repoSlug}

    ## Changed Files (TypeScript/TSX only)
    ${commit.changedFiles.map((f: string) => `- ${f}`).join('\n')}

    ## Commit Message
    ${commit.message}

    ## Code Diff (TypeScript/TSX files only, may be truncated)
    \`\`\`
    ${commit.diff}
    \`\`\`

    Create a well-structured markdown changelog organizing the changes into the appropriate categories.
  `

  const result = await agent.generate({ prompt })

  return result.text
}

