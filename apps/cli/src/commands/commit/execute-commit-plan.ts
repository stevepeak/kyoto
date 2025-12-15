import { assertNoGitIndexLock, getAllChangedFiles, runGit } from '@app/shell'
import { sleep } from '@app/utils'

import { type CommitPlan } from './commit-plan'

export async function executeCommitPlan(args: {
  gitRoot: string
  plan: CommitPlan
  onProgress?: (message: string) => void
  onStepStart?: (args: { order: number; commitMessage: string }) => void
  onStepComplete?: (args: { order: number; commitMessage: string }) => void
}): Promise<void> {
  const { gitRoot, plan, onProgress, onStepStart, onStepComplete } = args
  let committedSteps = 0

  await assertNoGitIndexLock({ gitRoot })

  for (const step of [...plan.steps].sort((a, b) => a.order - b.order)) {
    await assertNoGitIndexLock({ gitRoot })
    onStepStart?.({ order: step.order, commitMessage: step.commitMessage })

    // Get current changed files before each step to validate file paths
    // This ensures we only try to stage files that actually exist and have changes
    const currentChangedFiles = await getAllChangedFiles({ gitRoot })

    // Filter step files to only include files that actually have changes
    const validFiles = step.files.filter((file) =>
      currentChangedFiles.has(file),
    )

    if (validFiles.length === 0) {
      onProgress?.(`No valid files found for commit ${step.order}, skipping...`)
      onStepComplete?.({ order: step.order, commitMessage: step.commitMessage })
      continue
    }

    // Unstage any staged files before staging files for this commit
    // This ensures we start fresh for each commit step
    try {
      await runGit({ gitRoot, args: ['reset'] })
    } catch {
      // Ignore errors if there's nothing to reset
    }

    onProgress?.(`Staging files for commit ${step.order}...`)
    // Use -A so deletions are staged as well.
    await runGit({ gitRoot, args: ['add', '-A', '--', ...validFiles] })

    // If nothing is staged (e.g., filtered paths didn't stage anything), skip instead of failing.
    const { stdout: stagedFiles } = await runGit({
      gitRoot,
      args: ['diff', '--cached', '--name-only'],
    })
    if (stagedFiles.trim().length === 0) {
      onProgress?.(
        `No staged changes produced for commit ${step.order}, skipping...`,
      )
      onStepComplete?.({ order: step.order, commitMessage: step.commitMessage })
      continue
    }

    onProgress?.(`Committing ${step.order}: ${step.commitMessage}`)
    await sleep({ ms: 1000 })
    await runGit({
      gitRoot,
      args: ['commit', '-m', step.commitMessage],
    })

    committedSteps++
    onStepComplete?.({ order: step.order, commitMessage: step.commitMessage })
  }

  if (committedSteps === 0) {
    throw new Error(
      'No commits were created. None of the planned files matched the current git changes.',
    )
  }
}
