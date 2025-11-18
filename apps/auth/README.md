# Auth Proxy Service

OAuth proxy service that handles authentication redirects for preview deployments and other environments.

## Overview

This service acts as a proxy for OAuth authentication, allowing preview deployments (like Vercel preview branches) to use a single, stable OAuth callback URL while redirecting users back to their original deployment after authentication.

## Architecture

The service uses the OAuth `state` parameter to track where users should be redirected after authentication:

1. **OAuth Initiation** (`/github`): Receives a request with the origin/referer, encodes it in the `state` parameter, and redirects to GitHub OAuth
2. **OAuth Callback** (`/github/callback`): Receives the callback from GitHub, exchanges the code for a token, creates a session via Better Auth, and redirects back to the original URL

## Setup

### Environment Variables

Required environment variables:

- `DATABASE_URL`: PostgreSQL connection string (shared with main app)
- `GITHUB_CLIENT_ID`: GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth app client secret
- `AUTH_BASE_URL`: Base URL for the auth service (default: `https://auth.usekyoto.com` in production, `http://localhost:3002` in development)
- `BETTER_AUTH_TRUSTED_ORIGINS`: Comma-separated list of trusted origins (optional)

### GitHub OAuth App Configuration

The GitHub OAuth app must have the callback URL registered:
- Development: `http://localhost:3002/github/callback`
- Production: `https://auth.usekyoto.com/github/callback`

## Usage

### From a Preview Deployment

```typescript
// In your app, redirect to the auth proxy
const state = encodeURIComponent(
  JSON.stringify({ redirect: window.location.origin })
)

window.location.href = `https://auth.usekyoto.com/github?origin=${encodeURIComponent(window.location.origin)}`
```

Or using the `origin` query parameter:

```typescript
window.location.href = `https://auth.usekyoto.com/github?origin=${window.location.origin}`
```

The service will:
1. Redirect to GitHub OAuth with the callback URL set to the auth proxy
2. After GitHub redirects back, exchange the code for a token
3. Create a session using Better Auth
4. Redirect back to `${origin}/auth/success` with the session cookies set

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build
pnpm build

# Start production server (for local testing)
pnpm start
```

## Vercel Deployment

This app is configured for Vercel serverless functions. The app will automatically work on Vercel when deployed.

### Deployment Setup

1. **As a separate Vercel project**: Point Vercel to the `apps/auth` directory
2. **As part of monorepo**: Configure Vercel to handle the auth routes

The app uses:
- `api/index.ts` as the serverless entry point
- `vercel.json` for Vercel configuration
- Express app exported as default for Vercel's `@vercel/node` runtime

### Environment Variables for Vercel

Set these in your Vercel project settings:
- `DATABASE_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `AUTH_BASE_URL` (e.g., `https://auth.usekyoto.com`)
- `BETTER_AUTH_TRUSTED_ORIGINS` (optional, comma-separated)

## API Endpoints

- `GET /github`: Initiate GitHub OAuth flow
  - Query params: `origin` (optional, falls back to `Origin` or `Referer` header)
  - Returns: Redirect to GitHub OAuth

- `GET /github/callback`: Handle GitHub OAuth callback
  - Query params: `code`, `state` (from GitHub)
  - Returns: Redirect to original app with session cookies

- `GET /health`: Health check endpoint
  - Returns: `{ status: "ok" }`

- `ALL /api/*`: Better Auth API routes (proxied to Better Auth handler)

## Notes

- The service uses Better Auth for session management and user storage
- Session cookies are set by Better Auth and forwarded to the client
- The `state` parameter is base64-encoded JSON containing the redirect URL
- The service extracts the base origin (protocol + host) from the provided origin/referer

