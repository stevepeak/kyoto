import '@trigger.dev/sdk'

// Export tasks from local task definitions
export {
  handleGithubWebhookTask,
  supportedEventTypes,
  syncAllGithubInstallationsTask,
  syncGithubInstallationTask,
} from './tasks/github'
export { helloWorldTask } from './tasks/hello-world'
export { browserAgentTask } from './tasks/story-testing/browser'
export { browserAgentScheduledTask } from './tasks/story-testing/cron'
export { vmAgentTask } from './tasks/story-testing/vm'
