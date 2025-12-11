import '@trigger.dev/sdk'

// Export tasks from local task definitions
export { handleGithubWebhookTask, supportedEventTypes } from './tasks/github'
export { syncGithubInstallationTask } from './tasks/sync-github-installation'
export { syncAllGithubInstallationsTask } from './tasks/sync-all-github-installations'
export { helloWorldTask } from './tasks/hello-world'
