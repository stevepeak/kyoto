import { execFile } from 'node:child_process'

export async function runGit(args: {
  gitRoot: string
  args: string[]
}): Promise<{ stdout: string; stderr: string }> {
  const { gitRoot, args: gitArgs } = args

  return await new Promise((resolve, reject) => {
    execFile('git', gitArgs, { cwd: gitRoot }, (error, stdout, stderr) => {
      if (error) {
        const message =
          (stderr && stderr.trim().length > 0
            ? stderr
            : error.message
          ).trim() || 'git command failed'
        reject(new Error(message))
        return
      }

      resolve({ stdout, stderr })
    })
  })
}
