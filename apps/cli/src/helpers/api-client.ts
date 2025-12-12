/**
 * API client helper for making authenticated requests
 * 
 * @example
 * ```typescript
 * import { createAuthenticatedClient, requireAuth } from '@/helpers/api-client'
 * 
 * // In a command that requires authentication
 * const client = createAuthenticatedClient()
 * if (!client) {
 *   return <Text color="red">Please run: kyoto login</Text>
 * }
 * 
 * // Make authenticated requests
 * const response = await client.get('/api/user')
 * ```
 */

import { getSession, hasSession } from './session-storage'

const WEB_APP_URL = process.env.KYOTO_WEB_URL || 'http://localhost:3002'

export interface AuthenticatedClient {
  token: string
  baseURL: string
  
  /**
   * Make a GET request with authentication
   */
  get: (path: string) => Promise<Response>
  
  /**
   * Make a POST request with authentication
   */
  post: (path: string, body?: unknown) => Promise<Response>
  
  /**
   * Make a PUT request with authentication
   */
  put: (path: string, body?: unknown) => Promise<Response>
  
  /**
   * Make a DELETE request with authentication
   */
  delete: (path: string) => Promise<Response>
}

/**
 * Create an authenticated API client
 * Returns null if not authenticated
 */
export function createAuthenticatedClient(): AuthenticatedClient | null {
  const token = getSession()
  
  if (!token) {
    return null
  }
  
  const makeRequest = async (
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> => {
    const url = new URL(path, WEB_APP_URL)
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Send the session token as a cookie
        Cookie: `better-auth.session_token=${token}`,
      },
    }
    
    if (body) {
      options.body = JSON.stringify(body)
    }
    
    return fetch(url.toString(), options)
  }
  
  return {
    token,
    baseURL: WEB_APP_URL,
    get: (path) => makeRequest('GET', path),
    post: (path, body) => makeRequest('POST', path, body),
    put: (path, body) => makeRequest('PUT', path, body),
    delete: (path) => makeRequest('DELETE', path),
  }
}

/**
 * Require authentication, throwing an error if not authenticated
 * @throws Error if not authenticated
 */
export function requireAuth(): string {
  const token = getSession()
  
  if (!token) {
    throw new Error('Not authenticated. Please run: kyoto login')
  }
  
  return token
}

/**
 * Check if the user is authenticated
 */
export function isAuthenticated(): boolean {
  return hasSession()
}
