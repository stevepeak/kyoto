import { runGit } from '@app/shell'

import { type CommitPlan } from './commit-plan'

export async function executeCommitPlan(args: {
  gitRoot: string
  plan: CommitPlan
  onProgress?: (message: string) => void
  onStepStart?: (args: { order: number; commitMessage: string }) => void
  onStepComplete?: (args: { order: number; commitMessage: string }) => void
}): Promise<void> {
  const { gitRoot, plan, onProgress, onStepStart, onStepComplete } = args

  for (const step of [...plan.steps].sort((a, b) => a.order - b.order)) {
    onStepStart?.({ order: step.order, commitMessage: step.commitMessage })
    onProgress?.(`Staging files for commit ${step.order}...`)

    await runGit({ gitRoot, args: ['add', '--', ...step.files] })

    onProgress?.(`Committing ${step.order}: ${step.commitMessage}`)
    await runGit({
      gitRoot,
      args: ['commit', '-m', step.commitMessage],
    })

    onStepComplete?.({ order: step.order, commitMessage: step.commitMessage })
  }
}
