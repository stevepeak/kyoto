import { readFile, writeFile } from 'node:fs/promises'

import { type CommitPlan, CommitPlanSchema } from './commit-plan'

function isErrnoException(err: unknown): err is Error & { code?: unknown } {
  return err instanceof Error && 'code' in err
}

export async function writeCommitPlanFile(args: {
  commitPlanPath: string
  plan: CommitPlan
}): Promise<void> {
  const { commitPlanPath, plan } = args
  await writeFile(commitPlanPath, JSON.stringify(plan, null, 2), 'utf8')
}

export async function readCommitPlanFile(args: {
  commitPlanPath: string
}): Promise<CommitPlan | null> {
  const { commitPlanPath } = args

  try {
    const contents = await readFile(commitPlanPath, 'utf8')
    const raw: unknown = JSON.parse(contents)
    return CommitPlanSchema.parse(raw)
  } catch (err) {
    if (isErrnoException(err) && err.code === 'ENOENT') {
      return null
    }
    throw err
  }
}
