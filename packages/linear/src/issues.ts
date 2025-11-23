import type { CreateLinearIssueInput, CreateLinearIssueResult } from './types'
import { LINEAR_API_URL, type LinearGraphQLResponse } from './common'

interface CreateIssueResponse {
  issueCreate: {
    success: boolean
    issue: {
      id: string
      url: string
      identifier: string
      title: string
    } | null
  }
}

/**
 * Create a new issue in Linear using the GraphQL API
 */
export async function createLinearIssue(
  apiKey: string,
  input: CreateLinearIssueInput,
): Promise<CreateLinearIssueResult> {
  try {
    // GraphQL mutation to create an issue
    const mutation = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            url
            identifier
            title
          }
        }
      }
    `

    const variables: {
      input: {
        title: string
        description?: string
        teamId?: string
        labelIds?: string[]
        assigneeId?: string
      }
    } = {
      input: {
        title: input.title,
        ...(input.description && { description: input.description }),
        teamId: input.teamId,
        ...(input.labelIds &&
          input.labelIds.length > 0 && { labelIds: input.labelIds }),
        ...(input.assigneeId && { assigneeId: input.assigneeId }),
      },
    }

    const response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({
        query: mutation,
        variables,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `HTTP error: ${response.status} - ${errorText}`,
      }
    }

    const result: LinearGraphQLResponse<CreateIssueResponse> =
      await response.json()

    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors.map((e) => e.message).join(', ')
      return {
        success: false,
        error: `Linear API error: ${errorMessages}`,
      }
    }

    if (!result.data?.issueCreate.success) {
      return {
        success: false,
        error: 'Failed to create issue in Linear',
      }
    }

    const issue = result.data.issueCreate.issue
    if (!issue) {
      return {
        success: false,
        error: 'Issue was created but no issue data was returned',
      }
    }

    return {
      success: true,
      issueId: issue.id,
      issueUrl: issue.url,
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error occurred while creating issue',
    }
  }
}


