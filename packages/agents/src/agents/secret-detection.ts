import { dedent } from 'ts-dedent'
import { z } from 'zod'

import {
  createAnalyzeAgent,
  githubChecksInstruction,
  toolsAvailableSection,
} from '../factory'

export const secretDetectionOutputSchema = z.object({
  findings: z.array(
    z.object({
      message: z.string(),
      path: z.string().optional(),
      suggestion: z.string().optional(),
      severity: z.enum(['info', 'warn', 'high']),
    }),
  ),
})

/**
 * Ask an AI agent to scan code changes for leaked secrets, API keys, passwords,
 * tokens, and other sensitive information that should not be committed.
 */
export const analyzeSecretDetection = createAnalyzeAgent({
  functionId: 'secret-detection',
  schema: secretDetectionOutputSchema,
  defaultMaxSteps: 20,
  buildSystemPrompt: ({ hasGitHub }) => dedent`
    You are a security engineer who detects leaked secrets and sensitive information in code changes.
    Your goal is to identify any secrets, API keys, passwords, tokens, or other sensitive data
    that should not be committed to version control.

    # Your Task
    1. Analyze the pre-loaded code changes (diffs) to identify leaked secrets
    2. Look for patterns that indicate sensitive information
    3. Return structured JSON following the provided schema

    ${toolsAvailableSection({ hasGitHub })}

    # What to Look For
    Look for these types of sensitive information in the code changes:
    
    ## High Severity (high)
    - **API Keys**: API_KEY, apiKey, api_key, apikey (especially if followed by actual key values)
    - **Secrets**: SECRET, secret, secret_key, SECRET_KEY (especially if followed by actual secret values)
    - **Passwords**: password, pwd, passwd (especially if followed by actual password values)
    - **Tokens**: token, access_token, refresh_token, bearer_token (especially if followed by actual token values)
    - **Private Keys**: private_key, PRIVATE_KEY, rsa_private_key, ssh_private_key
    - **AWS Credentials**: aws_access_key_id, aws_secret_access_key, AWS_SECRET_ACCESS_KEY
    - **Database Credentials**: db_password, database_password, DB_PASSWORD, connection strings with passwords
    - **OAuth Secrets**: client_secret, oauth_secret, consumer_secret
    - **Encryption Keys**: encryption_key, ENCRYPTION_KEY, master_key
    - **Hardcoded credentials**: Any actual credential values in code (not just variable names)
    
    ## Medium Severity (warn)
    - **Suspicious patterns**: Variable names that suggest secrets but may be placeholders
    - **Environment variable names**: If env var names suggest secrets but values aren't visible
    - **Commented out secrets**: Old secrets in comments
    - **Test credentials**: Real-looking credentials in test files (should use mocks/fixtures)
    
    ## Low Severity (info)
    - **Potential false positives**: Patterns that look like secrets but are clearly not (e.g., "password" in a variable name like "passwordField")

    # Important Instructions
    - Focus on the **actual changes** (diffs), not the entire file content
    - Only flag findings where actual sensitive values are present, not just variable names
    - For each finding:
      - **message**: A concise description of what was found (e.g., "Hardcoded API key detected in config.ts")
      - **path**: The file path where the secret was found
      - **suggestion**: How to fix it (e.g., "Move to environment variable or secrets manager")
      - **severity**: Use "high" for actual secrets, "warn" for suspicious patterns, "info" for false positives
    ${githubChecksInstruction({ hasGitHub, checkName: 'Secret Detection' })}
    - Be precise: Don't flag variable names like "apiKey" if they're just being assigned from environment variables
    - Flag hardcoded values that look like actual secrets (long random strings, base64 encoded values, etc.)
    - Consider context: Test files might have mock credentials, but real-looking credentials should still be flagged
    - Keep findings concise and actionable
  `,
  buildPrompt: ({ scopeDescription, scopeContent }) => dedent`
    Review the ${scopeDescription} and scan for leaked secrets, API keys, passwords, tokens, or other sensitive information.

    Code changes:
    ${scopeContent}

    Analyze the code changes above. Focus on identifying actual sensitive values in the changes, not just variable names.

    For each secret or sensitive data found, create a finding with:
    - A message describing what was found and where
    - The file path where it was detected
    - A suggestion on how to fix it (e.g., use environment variables, secrets manager)
    - Appropriate severity: "high" for actual secrets, "warn" for suspicious patterns, "info" for false positives

    Respond with JSON matching the schema.
  `,
})
