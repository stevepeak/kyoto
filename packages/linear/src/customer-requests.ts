import type {
  CreateLinearCustomerRequestInput,
  CreateLinearCustomerRequestResult,
} from './types.js'
import { LINEAR_API_URL, type LinearGraphQLResponse } from './common.js'

interface CreateCustomerRequestResponse {
  customerNeedCreate: {
    success: boolean
  }
}

/**
 * Create a customer request (customer need) in Linear
 * This links a customer to an issue with feedback content
 */
export async function createLinearCustomerRequest(
  apiKey: string,
  input: CreateLinearCustomerRequestInput,
): Promise<CreateLinearCustomerRequestResult> {
  try {
    const mutation = `
      mutation CreateCustomerRequest($input: CustomerNeedCreateInput!) {
        customerNeedCreate(input: $input) {
          success
        }
      }
    `

    const variables: {
      input: {
        customerId: string
        issueId: string
        body: string
        priority: number
      }
    } = {
      input: {
        customerId: input.customerId,
        issueId: input.issueId,
        body: input.body,
        priority: input.priority,
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

    const result: LinearGraphQLResponse<CreateCustomerRequestResponse> =
      await response.json()

    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors.map((e) => e.message).join(', ')
      return {
        success: false,
        error: `Linear API error: ${errorMessages}`,
      }
    }

    if (!result.data?.customerNeedCreate.success) {
      return {
        success: false,
        error: 'Failed to create customer request in Linear',
      }
    }

    // CustomerNeedPayload doesn't return the ID, but the request is successfully created
    // The customer request is linked to the issue via the input parameters
    return {
      success: true,
      // customerRequestId is optional since Linear doesn't return it in the payload
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error occurred while creating customer request',
    }
  }
}
