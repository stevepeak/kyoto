import '@trigger.dev/sdk'

// Export tasks from local task definitions
export {
  handleGithubWebhookTask,
  supportedEventTypes,
  syncAllGithubInstallationsTask,
  syncGithubInstallationTask,
} from './tasks/github'
export { helloWorldTask } from './tasks/hello-world'
export { xpBrowserAgentTask } from './tasks/xp-browser-agent'
