import { Command } from '@oclif/core'
import chalk from 'chalk'
import inquirer from 'inquirer'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { findGitRoot, getCurrentBranch, getCurrentCommitSha } from '@app/shell'
import { updateDetailsJson } from '../helpers/config/update-details-json.js'

function getDefaultModelForProvider(provider: Provider): string {
  switch (provider) {
    case 'openai':
      return 'gpt-5-mini'
    case 'openrouter':
      return 'x-ai/grok-4.1-fast'
    case 'vercel':
      return 'openai/gpt-5-mini'
  }
}

type Provider = 'openai' | 'vercel' | 'openrouter'

interface DetailsJson {
  latest?: {
    sha: string
    branch: string
  }
  ai?: {
    provider: Provider
    apiKey: string
    model?: string
  }
}

export default class Init extends Command {
  static override description =
    'Initialize Kyoto by configuring your AI provider and API key'

  static override examples = ['$ kyoto init']

  override async run(): Promise<void> {
    const logger = (message: string) => {
      this.log(message)
    }

    try {
      // Get git root (but don't require AI keys for init)
      const gitRoot = await findGitRoot()

      // Ensure .kyoto directory exists
      const kyotoDir = join(gitRoot, '.kyoto')
      await mkdir(kyotoDir, { recursive: true })

      const detailsPath = join(kyotoDir, 'details.json')
      let details: DetailsJson = {}

      // Read existing details.json if it exists
      try {
        const content = await readFile(detailsPath, 'utf-8')
        details = JSON.parse(content) as DetailsJson
      } catch {
        // File doesn't exist or is invalid, start with empty object
        details = {}
      }

      // Prompt for provider
      const providerAnswer = await inquirer.prompt<{ provider: Provider }>([
        {
          type: 'select',
          name: 'provider',
          message: 'Which AI provider are you using?',
          choices: [
            { name: 'OpenAI', value: 'openai' },
            { name: 'Vercel AI Gateway', value: 'vercel' },
            { name: 'OpenRouter', value: 'openrouter' },
          ],
        },
      ])

      // Prompt for API key (as password/secret)
      const apiKeyAnswer = await inquirer.prompt<{ apiKey: string }>([
        {
          type: 'password',
          name: 'apiKey',
          message: `Enter your ${providerAnswer.provider === 'openai' ? 'OpenAI' : providerAnswer.provider === 'vercel' ? 'Vercel AI Gateway' : 'OpenRouter'} API key:`,
          mask: '*',
          validate: (value: string) => {
            if (!value || value.trim().length === 0) {
              return 'API key is required'
            }
            return true
          },
        },
      ])

      // Get default model for the selected provider
      const defaultModel = getDefaultModelForProvider(providerAnswer.provider)

      // Update details with AI configuration
      details.ai = {
        provider: providerAnswer.provider,
        apiKey: apiKeyAnswer.apiKey,
        model: defaultModel,
      }

      // Write the updated details back
      await writeFile(
        detailsPath,
        JSON.stringify(details, null, 2) + '\n',
        'utf-8',
      )

      // Update details.json with current branch and commit SHA
      const branch = await getCurrentBranch(gitRoot)
      const sha = await getCurrentCommitSha(gitRoot)
      await updateDetailsJson(detailsPath, branch, sha)

      logger(
        chalk.hex('#7ba179')(
          `\n✓ Successfully configured ${providerAnswer.provider === 'openai' ? 'OpenAI' : providerAnswer.provider === 'vercel' ? 'Vercel AI Gateway' : 'OpenRouter'} provider\n`,
        ),
      )
      logger(chalk.grey(`Configuration saved\n`))
    } catch (error) {
      if (error instanceof Error) {
        // Check if it's a git-related error
        if (
          error.message.includes('git') ||
          error.message.includes('Git repository')
        ) {
          logger(chalk.hex('#c27a52')(`\n⚠️  ${error.message}\n`))
          this.exit(1)
          return
        }
        // For other errors, use the default error handler
        this.error(error.message, { exit: 1 })
      } else {
        this.error('Failed to initialize Kyoto', { exit: 1 })
      }
    }
  }
}
