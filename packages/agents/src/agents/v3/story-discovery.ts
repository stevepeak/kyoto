import { type DiscoveredStory, discoveredStorySchema } from '@app/schemas'
import {
  createLocalReadFileTool,
  createLocalTerminalCommandTool,
  findGitRoot,
} from '@app/shell'
import { type Tracer } from '@opentelemetry/api'
import {
  Experimental_Agent as Agent,
  type LanguageModel,
  Output,
  stepCountIs,
} from 'ai'
import { readFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { dedent } from 'ts-dedent'
import z from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

import { agents } from '../../index'

type StoryDiscoveryAgentOptions = {
  filePath: string
  fileContent?: string
  options: {
    maxStories?: number
    maxSteps?: number
    model?: LanguageModel
    telemetryTracer?: Tracer
    logger?: (message: string) => void
  }
}

/**
 * System instructions for file-based discovery (from story-generator-agent)
 */
function buildSystemInstructions(maxStories?: number): string {
  const limitInstruction = maxStories
    ? `\n# Story Limit\nGenerate at most ${maxStories} story/stories from this file. Focus on the most important user behaviors first.\n`
    : ''

  return dedent`
    You are an expert QA engineer who writes **Gherkin-style user behavior stories**. ${limitInstruction}

    **Turn code into clear user-facing behavior stories**, not technical descriptions.

    # What You Produce

    For each meaningful user-facing behavior, produce:

    1. **Title** — one sentence describing the user outcome
    2. **Gherkin Story** — GIVEN / WHEN / THEN (testable by QA without reviewing code)
    3. **Dependencies** — brief notes:
      * Entry point (where user accesses the feature)
      * Exit point (what happens next / where user goes)
      * Prerequisites (user-visible requirements)
      * Side effects (user-visible changes)
    4. **Acceptance Criteria** — testable, user-visible outcomes (REQUIRED - never leave empty)
    5. **Code References** — \`filepath:lineStart:lineEnd\` for all files that contribute (REQUIRED - never leave empty)

    Return stories as JSON.

    # What Makes a Good User Story

    A good user story meets these criteria:

    1. **Business Value** — The story represents business logic that is valuable to the overall application.

    2. **Implementation-Agnostic** — The story does not concern underlying implementation details. It should be written so that code changes, improvements, or refactors would not adjust the user behavior (unless explicitly changed by the code). For example, how/where data is stored in a database is not relevant to the user seeing the information they desire.

    3. **Simple, Testable, and Valuable** — The story is simple, testable, and provides clear value.

    # Granularity Guidelines

    Stories must be at the **right level of granularity** - high enough to be implementation-agnostic, but specific enough to provide clear user-facing value.

    ## ✅ Good Examples (Right Granularity)

    - "User can sign in with GitHub" - Focuses on user outcome, not implementation
    - "User receives email confirmation after registration" - User-visible result
    - "User can create a new team" - Clear capability, not tied to specific API calls
    - "User sees error message when login fails" - User-visible feedback

    ## ❌ Bad Examples (Too Granular - Implementation Details)

    - "Button accepts children prop to customize label" - This is about component API, not user behavior
    - "Component calls signIn.social() method" - Implementation detail, user doesn't care about method names
    - "User clicks button that triggers POST /api/teams" - Too technical, mentions API endpoints
    - "Form validates email using regex pattern" - Implementation detail, user only sees validation result

    ## ❌ Bad Examples (Too Vague - Not Actionable)

    - "User interacts with authentication" - Too abstract, what specifically happens?
    - "Component renders correctly" - Not a user behavior, too vague
    - "User experiences the application" - No specific outcome

    ## ❌ Bad Examples (UI Rendering - Skip These)

    - "Page presents a welcome message and kanji label" - This is about static content rendering, not user behavior
    - "User sees a button with GitHub icon" - Describes UI appearance, not a meaningful action
    - "Component displays text and links" - Static content display is not a user behavior story

    **Before writing a story, ask yourself:**
    - "Would a user notice or care about this behavior?"
    - "Is this describing what the user experiences, or how the code works?"

    If it's about implementation details or static content rendering, skip it.

    # How to Work

    ### Step 1 — Determine if the file has distinct user-facing behaviors

    Evaluate if the target file, on its own, contains distinct aspects that inform user behavior. Look for:
    * User actions (clicking buttons, submitting forms, navigating)
    * User-visible results (messages, UI changes, displayed data)

    If the file only contains internal logic (helpers, utilities, schemas, state management), skip file discovery.

    ### Step 2 — Write a user story for each unique behavior

    For each unique user-facing behavior discovered, write a complete user story. Each story should focus on one outcome.

    **Critical**: Every story MUST include:
    - At least 3 acceptance criteria (user-visible, testable outcomes)
    - At least 1 code reference (the file being analyzed, plus any related files)

    ### Step 3 — Research and enrich with external context

    Use the provided tools to research related files and code paths. Include any external referenced files that contribute to the story, ensuring you capture entry points, exit points, prerequisites, and side effects.

    ### Step 4 — Return discovered stories

    Return all discovered stories as an array of story objects in your final output.

    # ❌ Exclude

    Skip stories about:
    * Static UI rendering (just displaying content, not user actions)
    * Component APIs, method names, or implementation details
    * Internal logic invisible to users
    * 
  
    # Story Format
    \`\`\`json
    ${JSON.stringify(zodToJsonSchema(discoveredStorySchema), null, 2)}
    \`\`\`

    Focus on what users experience, not how the code works.
  `
}

/**
 * Prompt builder for file-based discovery
 */
function buildPrompt(
  filePath: string,
  fileContent: string,
  maxStories?: number,
): string {
  const limitPrompt = maxStories
    ? `\n\nGenerate at most ${maxStories} story/stories from this file. Focus on the most important user behaviors first.`
    : ''

  return dedent`
    Analyze this code file and generate enriched user behavior stories.

    Target File: ${filePath}

    File Content:
    ${fileContent}
    ${limitPrompt}

    Workflow:
    1. First, navigate the codebase to understand context (imports, related files, parent components)
    2. Then, discover user behaviors in THIS FILE (focal point)
    3. Navigate the codebase to enrich each behavior with specific details (entry points, exit points, prerequisites, side effects)
    4. Return an array of all discovered story objects as your final output

    Remember: The target file is the focal point. Use navigation to enrich, not to discover new behaviors elsewhere.
  `
}

type StoryDiscoveryResult = {
  stories: DiscoveredStory[]
}

export async function runStoryDiscoveryAgent(
  options: StoryDiscoveryAgentOptions,
): Promise<StoryDiscoveryResult> {
  const { filePath, fileContent } = options
  const {
    maxStories,
    maxSteps = 30,
    model = agents.discovery.options.model,
    telemetryTracer,
    logger,
  } = options.options

  // Resolve file path relative to git root
  const gitRoot = await findGitRoot()
  const resolvedFilePath = isAbsolute(filePath)
    ? filePath
    : resolve(gitRoot, filePath)
  const content = fileContent ?? (await readFile(resolvedFilePath, 'utf-8'))

  const agent = new Agent({
    model,
    system: buildSystemInstructions(maxStories),
    tools: {
      terminalCommand: createLocalTerminalCommandTool(logger),
      readFile: createLocalReadFileTool(logger),
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'story-discovery-v3',
      metadata: {
        filePath,
      },
      tracer: telemetryTracer,
    },
    onStepFinish: (step) => {
      if (step.reasoningText) {
        logger?.(
          step.reasoningText === '[REDACTED]'
            ? 'Thinking...'
            : step.reasoningText,
        )
      }
    },
    stopWhen: stepCountIs(maxSteps),
    experimental_output: Output.object({
      schema: z.array(discoveredStorySchema),
    }),
  })

  const prompt = buildPrompt(filePath, content, maxStories)

  const result = await agent.generate({ prompt })
  const stories = result.experimental_output

  return { stories }
}
