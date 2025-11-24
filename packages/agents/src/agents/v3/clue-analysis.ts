import { Experimental_Agent as Agent, Output } from 'ai'
import type { LanguageModel } from 'ai'
import { dedent } from 'ts-dedent'
import { logger } from '@trigger.dev/sdk'
import { z } from 'zod'

import { agents } from '../..'
import type { Commit } from '@app/schemas'

export const clueAnalysisOutputSchema = z.object({
  hasClues: z
    .boolean()
    .describe('Whether there are clues suggesting feature changes'),
  clues: z
    .array(z.string())
    .describe(
      'List of specific clues or indicators of potential feature changes',
    ),
  explanation: z
    .string()
    .describe('Explanation of why clues were or were not found'),
})

export type ClueAnalysisResult = z.infer<typeof clueAnalysisOutputSchema>

interface AnalyzeCluesOptions {
  repoSlug: string
  commit: Commit
  model?: LanguageModel
}

/**
 * Agent to analyze commits and code diff for clues about potential feature changes
 * Note: Code diff is filtered to TypeScript/TSX files only and may be truncated.
 * The sandbox can be used for full context if needed.
 */
export async function analyzeClues({
  repoSlug,
  commit,
  model: providedModel,
}: AnalyzeCluesOptions): Promise<ClueAnalysisResult> {
  const model = providedModel ?? agents.discovery.options.model

  const agent = new Agent({
    model,
    system: dedent`
      You are an expert code analyst tasked with determining if a set of commits and code changes contain clues about potential feature changes or new functionality.

      # Your Task
      Analyze the provided commit messages and code diff to determine if there are any clues suggesting:
      - New features being added
      - Existing features being modified
      - User-facing changes
      - API changes
      - UI/UX changes
      - Behavioral changes

      # What to Look For
      - Commit messages mentioning features, fixes, additions, changes
      - Code changes in user-facing components (UI, API endpoints, routes)
      - New files being added
      - Significant modifications to existing functionality
      - Changes that affect user workflows

      # What to Ignore
      - Pure refactoring (renaming, code style changes)
      - Dependency updates
      - Configuration changes
      - Test-only changes
      - Documentation-only changes
      - Build/deployment changes

      # Output
      Return whether clues exist, list specific clues found, and explain your reasoning.
    `,
    experimental_output: Output.object({ schema: clueAnalysisOutputSchema }),
  })

  const prompt = dedent`
    Analyze these commits and code changes for clues about potential feature changes:

    ## Repository
    ${repoSlug}

    ## Changed Files (TypeScript/TSX only)
    ${commit.changedFiles.map((f: string) => `- ${f}`).join('\n')}

    ## Commit Message
    ${commit.message}

    ## Code Diff (TypeScript/TSX files only, may be truncated - sandbox available for full context)
    \`\`\`
    ${commit.diff}
    \`\`\`

    Determine if there are clues suggesting feature changes and list them.
  `

  logger.info('Analyzing clues from commits', {
    repoSlug,
    changedFileCount: commit.changedFiles.length,
  })

  const result = await agent.generate({ prompt })

  return result.experimental_output
}
