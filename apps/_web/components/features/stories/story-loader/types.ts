import { type CompositionAgentOutput } from '@app/schemas'

// Define StoryDiscoveryOutput type locally to avoid importing from @app/agents
export interface StoryDiscoveryOutput {
  stories: {
    text: string
    title?: string
  }[]
}

export interface Story {
  id: string
  name: string
  story: string
  state:
    | 'active'
    | 'archived'
    | 'generated'
    | 'paused'
    | 'planned'
    | 'processing'
  createdAt: Date | string | null
  updatedAt: Date | string | null
  composition: CompositionAgentOutput | null
  repoId: string
  metadata?: any
}

export interface StoryLoaderClientProps {
  orgName: string
  repoName: string
  storyId?: string
  initialStory?: Story | null
}
