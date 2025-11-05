import OpenAI from 'openai'
import { z } from 'zod'

import type { CodebaseFile } from './fetch-codebase'

export interface GeneratedStory {
  name: string
  story: string
  files: string[]
}

const storyResponseSchema = z.object({
  stories: z.array(
    z.object({
      name: z.string(),
      story: z.string(),
      files: z.array(z.string()),
    }),
  ),
})

interface GenerateStoriesParams {
  codebase: CodebaseFile[]
  apiKey: string
}

/**
 * Uses OpenRouter.ai to generate Gherkin-style stories from the codebase
 */
export async function generateStories(
  params: GenerateStoriesParams,
): Promise<GeneratedStory[]> {
  const { codebase, apiKey } = params

  // Format codebase for context
  const codebaseContext = codebase
    .map((file) => {
      const lines = file.content.split('\n')
      const lineCount = lines.length
      return `File: ${file.path} (${lineCount} lines)\n\`\`\`\n${file.content}\n\`\`\``
    })
    .join('\n\n---\n\n')

  // Create OpenAI client configured for OpenRouter
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/gwizinc/tailz', // Optional: identify your app
      'X-Title': 'Tailz Repository Analysis', // Optional: identify your app
    },
  })

  const prompt = `You are analyzing a codebase to identify core user functionality. Generate Gherkin-style stories that describe the main user-facing features and workflows.

For each story, provide:
1. A descriptive name/title
2. A complete Gherkin story with Feature, Scenario(s), Given/When/Then steps
3. An array of file references in the format "path@startLine:endLine" that relate to this story

Focus on:
- User-facing features and workflows
- Core business logic and functionality
- Integration points and APIs
- Authentication and authorization flows
- Data management operations

Format your response as JSON with this structure:
{
  "stories": [
    {
      "name": "Story title",
      "story": "Feature: ...\n  Scenario: ...\n    Given ...\n    When ...\n    Then ...",
      "files": ["path/to/file.ts@10:50", "another/file.tsx@5:30"]
    }
  ]
}

Codebase:
${codebaseContext}`

  try {
    const completion = await client.chat.completions.create({
      model: 'anthropic/claude-3.5-sonnet', // Using a good model for code analysis
      messages: [
        {
          role: 'system',
          content:
            'You are a software analyst that identifies user functionality in codebases and writes Gherkin-style stories. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent, structured output
      response_format: { type: 'json_object' }, // Request JSON response
    })

    const responseContent = completion.choices[0]?.message?.content
    if (!responseContent) {
      throw new Error('No response content from OpenRouter API')
    }

    // Parse JSON response
    let parsedResponse: unknown
    try {
      parsedResponse = JSON.parse(responseContent)
    } catch (parseError) {
      throw new Error(
        `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      )
    }

    // Validate with Zod schema
    const validated = storyResponseSchema.parse(parsedResponse)

    return validated.stories
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid response format from OpenRouter API: ${error.errors.map((e) => e.message).join(', ')}`,
      )
    }
    throw error
  }
}
