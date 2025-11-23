import type {
  CreateLinearCustomerInput,
  CreateLinearCustomerResult,
} from './types'
import { LINEAR_API_URL, type LinearGraphQLResponse } from './common'

interface CreateCustomerResponse {
  customerCreate: {
    success: boolean
    customer: {
      id: string
      name: string
    } | null
  }
}

interface FindCustomerResponse {
  customers: {
    nodes: Array<{
      id: string
      name: string
    }>
  }
}

/**
 * Find or create a customer in Linear using email or name
 */
export async function findOrCreateLinearCustomer(
  apiKey: string,
  input: CreateLinearCustomerInput,
): Promise<CreateLinearCustomerResult> {
  try {
    // First, try to find existing customer by email
    if (input.email) {
      const findQuery = `
        query FindCustomer($email: String!) {
          customers(filter: { email: { eq: $email } }) {
            nodes {
              id
              name
            }
          }
        }
      `

      const findResponse = await fetch(LINEAR_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey,
        },
        body: JSON.stringify({
          query: findQuery,
          variables: { email: input.email },
        }),
      })

      if (findResponse.ok) {
        const findResult: LinearGraphQLResponse<FindCustomerResponse> =
          await findResponse.json()
        if (
          findResult.data?.customers.nodes &&
          findResult.data.customers.nodes.length > 0
        ) {
          return {
            success: true,
            customerId: findResult.data.customers.nodes[0].id,
          }
        }
      }

      // If not found by email, try to find by domain
      const emailDomain = input.email.split('@')[1]
      if (emailDomain) {
        const domainFindQuery = `
          query FindCustomerByDomain($domain: String!) {
            customers(filter: { domains: { eq: [$domain] } }) {
              nodes {
                id
                name
              }
            }
          }
        `

        const domainFindResponse = await fetch(LINEAR_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: apiKey,
          },
          body: JSON.stringify({
            query: domainFindQuery,
            variables: { domain: emailDomain },
          }),
        })

        if (domainFindResponse.ok) {
          const domainFindResult: LinearGraphQLResponse<FindCustomerResponse> =
            await domainFindResponse.json()
          if (
            domainFindResult.data?.customers.nodes &&
            domainFindResult.data.customers.nodes.length > 0
          ) {
            return {
              success: true,
              customerId: domainFindResult.data.customers.nodes[0].id,
            }
          }
        }
      }
    }

    // If not found, create new customer
    const mutation = `
      mutation CreateCustomer($input: CustomerCreateInput!) {
        customerCreate(input: $input) {
          success
          customer {
            id
            name
          }
        }
      }
    `

    // Extract domain from email if provided
    const domains: string[] = []
    if (input.email) {
      const emailDomain = input.email.split('@')[1]
      if (emailDomain) {
        domains.push(emailDomain)
      }
    }
    if (input.domains && input.domains.length > 0) {
      domains.push(...input.domains)
    }

    const variables: {
      input: {
        name: string
        domains?: string[]
      }
    } = {
      input: {
        name: input.name,
        ...(domains.length > 0 && { domains }),
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

    const result: LinearGraphQLResponse<CreateCustomerResponse> =
      await response.json()

    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors.map((e) => e.message).join(', ')

      // If domain already exists, try to find the customer by domain
      const lowerErrorMessages = errorMessages.toLowerCase()
      if (
        (lowerErrorMessages.includes('domain already exists') ||
          lowerErrorMessages.includes('customer domain already exists')) &&
        domains.length > 0
      ) {
        // Try multiple domain filter approaches
        const domainFilterAttempts = [
          {
            filter: 'eq',
            query:
              'query FindCustomerByDomain($domain: String!) { customers(filter: { domains: { eq: [$domain] } }) { nodes { id name } } }',
          },
          {
            filter: 'contains',
            query:
              'query FindCustomerByDomain($domain: String!) { customers(filter: { domains: { contains: [$domain] } }) { nodes { id name } } }',
          },
          {
            filter: 'in',
            query:
              'query FindCustomerByDomain($domain: String!) { customers(filter: { domains: { in: [$domain] } }) { nodes { id name } } }',
          },
        ]

        for (const attempt of domainFilterAttempts) {
          const domainFindResponse = await fetch(LINEAR_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: apiKey,
            },
            body: JSON.stringify({
              query: attempt.query,
              variables: { domain: domains[0] },
            }),
          })

          if (domainFindResponse.ok) {
            const domainFindResult: LinearGraphQLResponse<FindCustomerResponse> =
              await domainFindResponse.json()

            // Check for GraphQL errors in the response
            if (
              !domainFindResult.errors &&
              domainFindResult.data?.customers.nodes &&
              domainFindResult.data.customers.nodes.length > 0
            ) {
              return {
                success: true,
                customerId: domainFindResult.data.customers.nodes[0].id,
              }
            }
          }
        }

        // If all domain searches failed, try creating without domain
        const createWithoutDomainResponse = await fetch(LINEAR_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: apiKey,
          },
          body: JSON.stringify({
            query: mutation,
            variables: {
              input: {
                name: input.name,
              },
            },
          }),
        })

        if (createWithoutDomainResponse.ok) {
          const createWithoutDomainResult: LinearGraphQLResponse<CreateCustomerResponse> =
            await createWithoutDomainResponse.json()

          if (
            !createWithoutDomainResult.errors &&
            createWithoutDomainResult.data?.customerCreate.success &&
            createWithoutDomainResult.data.customerCreate.customer
          ) {
            return {
              success: true,
              customerId:
                createWithoutDomainResult.data.customerCreate.customer.id,
            }
          }
        }
      }

      return {
        success: false,
        error: `Linear API error: ${errorMessages}`,
      }
    }

    if (!result.data?.customerCreate.success) {
      return {
        success: false,
        error: 'Failed to create customer in Linear',
      }
    }

    const customer = result.data.customerCreate.customer
    if (!customer) {
      return {
        success: false,
        error: 'Customer was created but no customer data was returned',
      }
    }

    return {
      success: true,
      customerId: customer.id,
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error occurred while creating customer',
    }
  }
}


