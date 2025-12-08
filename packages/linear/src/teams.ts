import { LINEAR_API_URL, type LinearGraphQLResponse } from './common'
import { type GetLinearTeamsResult, type LinearTeam } from './types'

interface GetTeamsResponse {
  teams: {
    nodes: {
      id: string
      name: string
      key: string
    }[]
  }
}

/**
 * Get all teams from Linear workspace
 */
export async function getLinearTeams(
  apiKey: string,
): Promise<GetLinearTeamsResult> {
  try {
    const query = `
      query GetTeams {
        teams {
          nodes {
            id
            name
            key
          }
        }
      }
    `

    const response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({
        query,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `HTTP error: ${response.status} - ${errorText}`,
      }
    }

    const result: LinearGraphQLResponse<GetTeamsResponse> =
      await response.json()

    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors.map((e) => e.message).join(', ')
      return {
        success: false,
        error: `Linear API error: ${errorMessages}`,
      }
    }

    if (!result.data?.teams) {
      return {
        success: false,
        error: 'No teams data returned from Linear',
      }
    }

    const teams: LinearTeam[] = result.data.teams.nodes.map((team) => ({
      id: team.id,
      name: team.name,
      key: team.key,
    }))

    return {
      success: true,
      teams,
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error occurred while fetching teams',
    }
  }
}
