import '@trigger.dev/sdk'

// Export tasks from local task definitions
export {
  handleGithubWebhookTask,
  supportedEventTypes,
  syncGithubInstallationTask,
  syncAllGithubInstallationsTask,
} from './tasks/github'
export { helloWorldTask } from './tasks/hello-world'
