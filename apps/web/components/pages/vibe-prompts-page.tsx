'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

import { Kanji } from '@/components/display/kanji'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type PromptId =
  | 'write-plan'
  | 'review-plan'
  | 'prepare-plan'
  | 'execute-plan'
  | 'continue-plan'
  | 'clean'

type Prompt = {
  id: PromptId
  name: string
  description: string
  content: string
}

const prompts: Prompt[] = [
  {
    id: 'write-plan',
    name: 'Write Plan',
    description: 'Create an initial development plan',
    content: `# Write Plan

This command helps you create a comprehensive development plan for your task.

## Usage
Use this command when starting a new feature or task to break it down into actionable steps.

## Example
\`\`\`
@write-plan
\`\`\`

The AI will analyze your requirements and create a structured plan.`,
  },
  {
    id: 'review-plan',
    name: 'Review Plan',
    description: 'Review and refine the existing plan',
    content: `# Review Plan

This command allows you to review and refine an existing development plan.

## Usage
Use this after creating a plan to ensure it's comprehensive and well-structured.

## Example
\`\`\`
@review-plan
\`\`\`

The AI will review your plan and suggest improvements or identify potential issues.`,
  },
  {
    id: 'prepare-plan',
    name: 'Prepare Plan',
    description: 'Prepare the environment and dependencies for execution',
    content: `# Prepare Plan

This command prepares your development environment and ensures all dependencies are ready.

## Usage
Use this before executing a plan to set up the necessary environment and tools.

## Example
\`\`\`
@prepare-plan
\`\`\`

The AI will check dependencies, set up configurations, and prepare the workspace.`,
  },
  {
    id: 'execute-plan',
    name: 'Execute Plan',
    description: 'Execute the development plan step by step',
    content: `# Execute Plan

This command executes your development plan, implementing the planned changes.

## Usage
Use this to start implementing the plan you've created and reviewed.

## Example
\`\`\`
@execute-plan
\`\`\`

The AI will follow your plan and implement the changes systematically.`,
  },
  {
    id: 'continue-plan',
    name: 'Continue Plan',
    description: 'Continue execution from where it left off',
    content: `# Continue Plan

This command continues executing a plan that was paused or interrupted.

## Usage
Use this if execution was stopped and you want to resume from the last completed step.

## Example
\`\`\`
@continue-plan
\`\`\`

The AI will resume execution from the last checkpoint.`,
  },
  {
    id: 'clean',
    name: 'Clean',
    description: 'Clean up temporary files and artifacts',
    content: `# Clean

This command cleans up temporary files, build artifacts, and other generated content.

## Usage
Use this to remove temporary files and keep your workspace clean.

## Example
\`\`\`
@clean
\`\`\`

The AI will identify and remove temporary files, build artifacts, and other cleanup tasks.`,
  },
]

export function VibePromptsPage() {
  const [selectedPrompt, setSelectedPrompt] = useState<PromptId>('write-plan')

  const currentPrompt =
    prompts.find((p) => p.id === selectedPrompt) ?? prompts[0]

  return (
    <div className="container mx-auto min-h-[calc(100vh-4rem)] py-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="text-center">
          <Kanji
            title="Vibe prompts - Free prompts that improve your coding experience"
            className="mb-2"
          >
            プロンプト
          </Kanji>
          <h1 className="font-cormorant text-5xl font-semibold tracking-tight">
            Vibe Prompts
          </h1>
          <p className="mt-3 text-lg italic text-muted-foreground">
            Free prompts that improve your vibe coding experience
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Prompts List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Prompts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {prompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => {
                      setSelectedPrompt(prompt.id)
                    }}
                    className={cn(
                      'w-full rounded-lg border p-4 text-left transition-all',
                      'hover:bg-muted/50 hover:border-foreground/20',
                      selectedPrompt === prompt.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-border',
                    )}
                  >
                    <div className="font-semibold">{prompt.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {prompt.description}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Prompt Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{currentPrompt.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{currentPrompt.content}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* Video Section */}
            <Card>
              <CardHeader>
                <CardTitle>How to Use</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                  <video
                    className="h-full w-full object-contain"
                    autoPlay
                    loop
                    muted
                    playsInline
                  >
                    <source
                      src="/videos/vibe-prompts-demo.mp4"
                      type="video/mp4"
                    />
                    Your browser does not support the video tag.
                  </video>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Watch how to use these prompts in Cursor. The video will loop
                  automatically.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
