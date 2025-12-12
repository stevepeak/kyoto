import { getConfig } from '@app/config'
import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'

export function createOctokit(installationId: number): Octokit {
  const env = getConfig()
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: env.GITHUB_APP_ID,
      privateKey: env.GITHUB_APP_PRIVATE_KEY,
      installationId,
    },
  })
}
