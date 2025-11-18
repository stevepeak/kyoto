import express, {
  type Express,
  type Request as ExpressRequest,
  type Response as ExpressResponse,
} from 'express'
import { betterAuth } from 'better-auth'
// @ts-expect-error - better-auth adapter path resolution
import { kyselyAdapter } from 'better-auth/adapters/kysely-adapter'
import { setupDb } from '@app/db'

const app: Express = express()
const PORT = process.env.PORT || 3002

// Parse JSON and URL-encoded bodies
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Initialize database
function getDb() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is required. Please set it in your .env file.',
    )
  }
  return setupDb(databaseUrl)
}

// Initialize Better Auth
function getBaseUrl(): string {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3002'
  }
  return process.env.AUTH_BASE_URL || 'https://auth.usekyoto.com'
}

function getTrustedOrigins(): string[] {
  const origins: string[] = []

  // Always include the base URL
  const baseUrl = getBaseUrl()
  if (baseUrl) {
    origins.push(baseUrl)
  }

  // Include production domain
  if (process.env.SITE_PRODUCTION_URL) {
    origins.push(`https://${process.env.SITE_PRODUCTION_URL}`)
  }

  // Include usekyoto.com
  origins.push('https://usekyoto.com', 'http://localhost:3001')

  // Include any additional trusted origins from environment variable
  if (process.env.BETTER_AUTH_TRUSTED_ORIGINS) {
    const additionalOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(
      ',',
    ).map((origin) => origin.trim())
    origins.push(...additionalOrigins)
  }

  // Remove duplicates
  return Array.from(new Set(origins))
}

const auth = betterAuth({
  baseURL: getBaseUrl(),
  trustedOrigins: getTrustedOrigins(),
  database: kyselyAdapter(getDb(), {
    type: 'postgres',
  }),
  verification: {
    fields: {
      expiresAt: 'expires_at',
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      scope: ['email'],
    },
  },
})

// Helper function to convert Express request to Fetch API Request
function expressToFetchRequest(req: ExpressRequest): globalThis.Request {
  const protocol = req.protocol
  const host = req.get('host') || ''
  const url = `${protocol}://${host}${req.originalUrl || req.url}`
  const headers = new Headers()

  // Copy all headers
  Object.keys(req.headers).forEach((key) => {
    const value = req.headers[key]
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v))
      } else {
        headers.set(key, value)
      }
    }
  })

  // Create Fetch API Request
  return new Request(url, {
    method: req.method,
    headers,
    body:
      req.method !== 'GET' && req.method !== 'HEAD'
        ? JSON.stringify(req.body)
        : undefined,
  })
}

// Helper function to convert Fetch API Response to Express response
async function fetchToExpressResponse(
  fetchResponse: globalThis.Response,
  expressRes: ExpressResponse,
): Promise<void> {
  // Copy status
  expressRes.status(fetchResponse.status)

  // Copy headers
  fetchResponse.headers.forEach((value, key) => {
    // Skip content-encoding and transfer-encoding as Express handles these
    if (
      key.toLowerCase() !== 'content-encoding' &&
      key.toLowerCase() !== 'transfer-encoding'
    ) {
      expressRes.setHeader(key, value)
    }
  })

  // Handle redirects
  if (fetchResponse.status >= 300 && fetchResponse.status < 400) {
    const location = fetchResponse.headers.get('location')
    if (location) {
      return expressRes.redirect(fetchResponse.status, location)
    }
  }

  // Copy body
  const body = await fetchResponse.text()
  expressRes.send(body)
}

// Mount Better Auth API routes
app.all('/api/*', async (req, res) => {
  try {
    const fetchRequest = expressToFetchRequest(req)
    const fetchResponse = await auth.handler(fetchRequest)
    await fetchToExpressResponse(fetchResponse, res)
  } catch (error) {
    console.error('Better Auth handler error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// OAuth proxy route: Initiate GitHub OAuth
app.get('/github', (req, res) => {
  const origin =
    (req.query.origin as string) || req.headers.origin || req.headers.referer

  if (!origin) {
    return res.status(400).json({ error: 'Missing origin or referer header' })
  }

  // Extract base origin (remove path)
  let baseOrigin = origin
  try {
    const url = new URL(origin)
    baseOrigin = `${url.protocol}//${url.host}`
  } catch {
    // If origin is not a valid URL, use it as-is
  }

  // Create state with redirect URL
  const state = Buffer.from(JSON.stringify({ redirect: baseOrigin })).toString(
    'base64',
  )

  const redirectUri = `${getBaseUrl()}/github/callback`
  const githubAuthUrl =
    `https://github.com/login/oauth/authorize?` +
    `client_id=${process.env.GITHUB_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=email` +
    `&state=${state}`

  res.redirect(githubAuthUrl)
})

// OAuth callback handler
app.get('/github/callback', async (req, res) => {
  const { code, state, error } = req.query

  if (error) {
    const errorMessage = error as string
    // Try to extract redirect from state if available
    let redirectTarget = 'http://localhost:3001'
    try {
      if (state) {
        const stateData = JSON.parse(
          Buffer.from(state as string, 'base64').toString(),
        )
        redirectTarget = stateData.redirect || redirectTarget
      }
    } catch {
      // Ignore state parsing errors
    }
    return res.redirect(
      `${redirectTarget}/auth/error?message=${encodeURIComponent(errorMessage)}`,
    )
  }

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state parameter' })
  }

  try {
    // Decode state to get redirect URL
    const stateData = JSON.parse(
      Buffer.from(state as string, 'base64').toString(),
    )
    const redirectTarget = stateData.redirect

    if (!redirectTarget) {
      return res.status(400).json({ error: 'Invalid state: missing redirect' })
    }

    // Exchange code for access token manually
    // This gives us control over the state parameter
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code: code as string,
          redirect_uri: `${getBaseUrl()}/github/callback`,
        }),
      },
    )

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('GitHub token exchange error:', errorText)
      return res.redirect(
        `${redirectTarget}/auth/error?message=${encodeURIComponent('Token exchange failed')}`,
      )
    }

    const tokenData = (await tokenResponse.json()) as {
      error?: string
      error_description?: string
      access_token?: string
    }

    if (tokenData.error) {
      console.error('GitHub OAuth error:', tokenData.error)
      return res.redirect(
        `${redirectTarget}/auth/error?message=${encodeURIComponent(tokenData.error_description || 'Authentication failed')}`,
      )
    }

    const accessToken = tokenData.access_token

    if (!accessToken) {
      return res.redirect(
        `${redirectTarget}/auth/error?message=${encodeURIComponent('No access token received')}`,
      )
    }

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!userResponse.ok) {
      console.error('Failed to fetch GitHub user info')
      return res.redirect(
        `${redirectTarget}/auth/error?message=${encodeURIComponent('Failed to fetch user info')}`,
      )
    }

    const githubUser = (await userResponse.json()) as {
      id: number
      login: string
      name?: string
      email?: string
      avatar_url?: string
    }

    // Get user email (might need to fetch from emails endpoint)
    let email = githubUser.email
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      })
      if (emailsResponse.ok) {
        const emails = (await emailsResponse.json()) as Array<{
          email: string
          primary: boolean
        }>
        const primaryEmail = emails.find((e) => e.primary)
        email = primaryEmail?.email || emails[0]?.email
      }
    }

    // Use Better Auth to create a session from the OAuth token
    // Better Auth expects to handle OAuth callbacks, so we'll call its callback endpoint
    // but we need to work around the state parameter issue
    // Better Auth's callback will handle user creation/linking and session management

    // Call Better Auth's social callback endpoint with the code
    // Note: Better Auth might validate its own state, but we'll try without it
    const betterAuthCallbackUrl = `${getBaseUrl()}/api/auth/social/github/callback`
    const authCallbackRequest = new globalThis.Request(
      `${betterAuthCallbackUrl}?code=${code}`,
      {
        method: 'GET',
        headers: req.headers as Record<string, string>,
      },
    )

    const authResponse = await auth.handler(authCallbackRequest)

    // Extract cookies from Better Auth response
    const setCookieHeader = authResponse.headers.get('set-cookie')
    if (setCookieHeader) {
      // Handle multiple cookies
      const cookies = setCookieHeader.split(',').map((cookie) => cookie.trim())
      cookies.forEach((cookie) => {
        res.setHeader('set-cookie', cookie)
      })
    }

    // Redirect to the original app
    return res.redirect(`${redirectTarget}/auth/success`)
  } catch (error) {
    console.error('OAuth callback error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Export the app for Vercel serverless functions
// In development, we still need to listen on a port
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Auth proxy server listening on port ${PORT}`)
    console.log(`Base URL: ${getBaseUrl()}`)
  })
}

export default app
