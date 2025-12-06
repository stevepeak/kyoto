import { Experimental_Agent as Agent, Output, stepCountIs } from 'ai'
import type { LanguageModel } from 'ai'
import { z } from 'zod'
import type { StoryFile } from './story-file-reader.js'

const mermaidChartOutputSchema = z.object({
  chart: z.string().describe('Mermaid diagram code (flowchart, graph, etc.)'),
  chartType: z
    .enum(['flowchart', 'graph', 'sequenceDiagram', 'stateDiagram'])
    .describe('Type of mermaid chart generated'),
})

interface GenerateMermaidChartOptions {
  model: LanguageModel
  stories: StoryFile[]
  folderPath: string
  onProgress?: (message: string) => void
}

/**
 * Generates a mermaid diagram showing relationships and flow between stories in a domain.
 * Returns the mermaid diagram code as a string.
 */
export async function generateMermaidChart(
  options: GenerateMermaidChartOptions,
): Promise<string> {
  const { model, stories, folderPath, onProgress } = options

  if (stories.length === 0) {
    return `graph TD
    A[No stories in this domain]`
  }

  if (stories.length === 1) {
    // For a single story, create a simple node
    const story = stories[0]!
    return `graph TD
    A["${story.story.title}"]`
  }

  const agent = new Agent({
    model,
    system: `You are an expert at creating visual diagrams to represent relationships and flows between user behavior stories.

# Objective
Analyze the provided stories in a domain and create a Mermaid diagram that shows:
1. Relationships between stories (dependencies, flows, sequences)
2. The structure and organization of behaviors in this domain
3. How stories connect or relate to each other

# Mermaid Chart Types
Choose the most appropriate chart type:
- **flowchart**: For showing flow between stories (most common)
- **graph**: For showing relationships and connections
- **sequenceDiagram**: For showing temporal sequences
- **stateDiagram**: For showing state transitions

# Guidelines
- Use clear, descriptive node labels (story titles)
- Show logical relationships (dependencies, sequences, groupings)
- Keep the diagram readable and not too complex
- Use appropriate Mermaid syntax
- Node IDs should be safe identifiers (alphanumeric and underscores only)
- Node labels can contain the full story title in quotes

# Output Format
Return a JSON object with:
- chart: The complete Mermaid diagram code
- chartType: The type of chart (flowchart, graph, sequenceDiagram, stateDiagram)

# Example
For stories about authentication:
\`\`\`json
{
  "chart": "flowchart TD\\n    A[User Login] --> B[Validate Credentials]\\n    B --> C[Create Session]",
  "chartType": "flowchart"
}
\`\`\``,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'wiki-mermaid-generator',
      metadata: {
        folderPath,
        storyCount: stories.length,
      },
    },
    stopWhen: stepCountIs(30),
    onStepFinish: (step) => {
      if (step.reasoningText) {
        onProgress?.(step.reasoningText)
      }
    },
    experimental_output: Output.object({
      schema: mermaidChartOutputSchema,
    }),
  })

  // Create a summary of all stories for the agent
  const storiesSummary = stories
    .map((file, index) => ({
      index,
      title: file.story.title,
      behavior: file.story.behavior,
      dependencies: file.story.dependencies,
    }))
    .map(
      (s) =>
        `Story ${s.index + 1}: **${s.title}**\nBehavior: ${s.behavior}\nDependencies: ${JSON.stringify(s.dependencies)}`,
    )
    .join('\n\n---\n\n')

  const prompt = `Generate a Mermaid diagram for the domain "${folderPath}".

This domain contains ${stories.length} stories:

${storiesSummary}

Analyze the relationships, dependencies, and flow between these stories and create an appropriate Mermaid diagram. Consider:
- Story dependencies (entry/exit points)
- Behavioral flows
- Logical groupings
- Sequences or state transitions

Return a JSON object with the chart code and chart type.`

  try {
    const result = await agent.generate({ prompt })

    if (result.experimental_output) {
      const output = result.experimental_output as z.infer<
        typeof mermaidChartOutputSchema
      >
      return output.chart as string
    }

    // Fallback: try to parse raw text
    const rawText = result.text
    if (rawText) {
      try {
        const parsed = JSON.parse(rawText)
        const validationResult = mermaidChartOutputSchema.safeParse(parsed)
        if (validationResult.success) {
          return validationResult.data.chart as string
        }
      } catch {
        // If parsing fails, return a simple flowchart
        onProgress?.('⚠️  Could not parse mermaid output, using fallback')
      }
    }

    // Fallback: create a simple flowchart
    const nodeIds = stories.map((_, i) => `A${i + 1}`)
    const nodes = stories
      .map(
        (story, i) =>
          `    ${nodeIds[i]}["${story.story.title.replace(/"/g, "'")}"]`,
      )
      .join('\n')
    const connections = nodeIds
      .slice(0, -1)
      .map((id, i) => `    ${id} --> ${nodeIds[i + 1]}`)
      .join('\n')

    return `flowchart TD
${nodes}
${connections}`
  } catch (error) {
    if (error instanceof Error) {
      onProgress?.(`❌ Error generating mermaid chart: ${error.message}`)
    }
    // Return a fallback simple chart
    const nodeIds = stories.map((_, i) => `A${i + 1}`)
    const nodes = stories
      .map(
        (story, i) =>
          `    ${nodeIds[i]}["${story.story.title.replace(/"/g, "'")}"]`,
      )
      .join('\n')

    return `flowchart TD
${nodes}`
  }
}
