import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import type { LanguageModel } from 'ai'
import type { StoryFile } from './story-file-reader.js'

interface GenerateDomainSummaryOptions {
  model: LanguageModel
  stories: StoryFile[]
  folderPath: string
  onProgress?: (message: string) => void
}

/**
 * Generates an AI-powered summary of all stories in a domain/folder.
 * Returns a markdown summary describing what the domain represents and what stories it contains.
 */
export async function generateDomainSummary(
  options: GenerateDomainSummaryOptions,
): Promise<string> {
  const { model, stories, folderPath, onProgress } = options

  if (stories.length === 0) {
    return `No stories found in this domain.`
  }

  const agent = new Agent({
    model,
    system: `You are an expert technical writer and software analyst tasked with creating clear, concise summaries of user behavior stories organized by domain.

# Objective
Analyze the provided stories in a domain/folder and create a comprehensive summary that:
1. Describes what this domain represents in the application
2. Explains the purpose and scope of the stories in this domain
3. Highlights key behaviors and patterns
4. Provides context for understanding the domain's role in the system

# Guidelines
- Write in clear, professional markdown format
- Keep the summary concise but informative (2-4 paragraphs)
- Focus on the "what" and "why" of the domain, not implementation details
- Use proper markdown formatting (headers, lists, emphasis)
- Make it useful for both technical and non-technical readers

# Output
Return a markdown summary text that describes the domain and its stories.`,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'wiki-domain-summary',
      metadata: {
        folderPath,
        storyCount: stories.length,
      },
    },
    stopWhen: stepCountIs(20),
    onStepFinish: (step) => {
      if (step.reasoningText) {
        onProgress?.(step.reasoningText)
      }
    },
    experimental_output: Output.text(),
  })

  // Create a summary of all stories for the agent
  const storiesSummary = stories
    .map((file) => ({
      title: file.story.title,
      behavior: file.story.behavior,
    }))
    .map((s) => `**${s.title}**\n${s.behavior}`)
    .join('\n\n---\n\n')

  const prompt = `Generate a comprehensive summary for the domain "${folderPath}".

This domain contains ${stories.length} story/stories:

${storiesSummary}

Create a markdown summary that describes:
1. What this domain represents in the application
2. The purpose and scope of the behaviors in this domain
3. Key patterns or themes across the stories
4. How this domain fits into the overall system

Return only the markdown summary text, no additional formatting.`

  try {
    const result = await agent.generate({ prompt })
    return result.text
  } catch (error) {
    if (error instanceof Error) {
      onProgress?.(`❌ Error generating summary: ${error.message}`)
    }
    throw error
  }
}

