import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'
import { parseEnv } from './env'

export function createOctokit(installationId: number): Octokit {
  const env = parseEnv()
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: env.GITHUB_APP_ID,
      privateKey: env.GITHUB_APP_PRIVATE_KEY,
      installationId,
    },
  })
}
