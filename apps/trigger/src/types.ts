interface RunWorkflowPayload {
  orgSlug: string
  repoName: string
  branchName?: string
}

export interface StoryTestResult {
  storyId: string
  status: 'pass' | 'fail' | 'skipped'
  error?: string
}
