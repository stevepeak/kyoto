# CLI Authentication

This document describes the CLI authentication flow using GitHub OAuth through the web application.

## Overview

The Kyoto CLI uses a secure OAuth flow to authenticate users via GitHub. The authentication process involves:

1. **CLI Login Command**: User runs `kyoto login`
2. **Local Callback Server**: CLI starts a local HTTP server to receive the auth callback
3. **Browser OAuth**: Browser opens to the web app for GitHub OAuth
4. **Token Exchange**: After successful OAuth, the web app sends the session token back to the CLI
5. **Session Storage**: CLI stores the token in memory for the current session

## Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│             │         │             │         │             │
│     CLI     │◄────────│   Web App   │◄────────│   GitHub    │
│             │         │             │         │   OAuth     │
└─────────────┘         └─────────────┘         └─────────────┘
      │                       │
      │ 1. kyoto login        │
      │ 2. Start local server │
      │ 3. Open browser ─────►│
      │                       │ 4. GitHub OAuth ──►
      │                       │◄── 5. User grants ──
      │                       │ 6. Get session token
      │◄── 7. Send token ─────│
      │ 8. Store in memory    │
      │                       │
```

## Security Features

### State Management

- **CSRF Protection**: Uses cryptographically secure random state tokens (32 bytes)
- **State Validation**: The CLI validates that the state returned matches the state sent
- **One-time Use**: Each login flow generates a unique state token

### Session Storage

- **In-Memory Only**: For testing purposes, tokens are stored in a Map and lost on process exit
- **No Persistence**: Tokens are never written to disk in this implementation
- **Scoped Access**: Only the current process has access to the session

### Network Security

- **Localhost Only**: Callback server binds to localhost only
- **Random Ports**: Uses random available ports to avoid conflicts
- **CORS Headers**: Properly configured CORS for web-to-CLI communication
- **HTTPS Ready**: Web app should use HTTPS in production

## Implementation Details

### CLI Components

#### Login Command (`apps/cli/src/commands/login.tsx`)

The login command:
- Generates a secure random state token using `crypto.randomBytes(32)`
- Starts an HTTP server on a random port using `server.listen(0)`
- Opens the browser to the web auth page with state and port parameters
- Waits for the callback with the session token
- Validates the state parameter before accepting the token
- Stores the token using the session storage helper

#### Logout Command (`apps/cli/src/commands/logout.tsx`)

Simple command to clear the current session from memory.

#### Session Storage (`apps/cli/src/helpers/session-storage.ts`)

In-memory Map-based storage with functions:
- `storeSession(token: string)`: Store a session token
- `getSession()`: Retrieve the current session token
- `hasSession()`: Check if a session exists
- `clearSession()`: Remove the current session

### Web Components

#### CLI Auth Page (`apps/web/app/cli/auth/page.tsx`)

Client-side page that:
- Extracts state and port from URL parameters
- Checks if user is already authenticated
- Triggers GitHub OAuth if not authenticated
- Calls the session API to get the token
- Redirects to the CLI callback server with the token

#### Session API (`apps/web/app/api/cli/session/route.ts`)

Server-side API endpoint that:
- Validates the user is authenticated via better-auth
- Extracts the session token from better-auth
- Returns the token and user info as JSON
- Handles errors gracefully

## Usage

### Login

```bash
kyoto login
```

This will:
1. Open your browser to authenticate with GitHub
2. Wait for authentication to complete
3. Display a success message
4. Store the session token for future API calls

### Logout

```bash
kyoto logout
```

This will clear the current session from memory.

### Checking Authentication Status

```typescript
import { hasSession, getSession } from '@/helpers/session-storage'

if (hasSession()) {
  const token = getSession()
  // Make authenticated API calls
} else {
  console.log('Please run: kyoto login')
}
```

## Environment Variables

The CLI needs the following environment variable:

- `KYOTO_WEB_URL`: URL of the web app (defaults to `http://localhost:3002`)

## Future Improvements

For production use, consider:

1. **Persistent Storage**: Store tokens in a secure config file (e.g., `~/.kyoto/credentials`)
2. **Token Encryption**: Encrypt tokens at rest using the system keychain
3. **Token Refresh**: Implement token refresh logic for long-lived sessions
4. **Multiple Sessions**: Support multiple user accounts
5. **Token Expiration**: Handle token expiration gracefully
6. **Database Storage**: Store CLI sessions in the database for server-side validation

## Troubleshooting

### Browser doesn't open

The CLI tries to open the browser automatically. If this fails:
1. Copy the URL from the terminal
2. Manually open it in your browser
3. Complete the authentication

### Callback fails

If the callback to the CLI fails:
1. Check that the CLI is still running
2. Verify firewall isn't blocking localhost
3. Try again with a fresh login attempt

### Already authenticated

If you're already logged in, the CLI will notify you. To login with a different account:
1. Run `kyoto logout`
2. Run `kyoto login` again

## Better Auth Considerations

This implementation works with better-auth's default configuration. Key points:

- **Session Cookies**: Better-auth stores session tokens in HTTP-only cookies
- **Session API**: We use better-auth's `getSession` API to validate sessions
- **OAuth Flow**: Better-auth handles the GitHub OAuth flow automatically
- **Redirects**: After OAuth, better-auth redirects back to the `callbackURL` we specify

### Redirect Flow

The redirect flow is critical:

1. CLI opens: `/cli/auth?state=xxx&port=1234`
2. User clicks "Sign in with GitHub"
3. Better-auth redirects to GitHub OAuth
4. GitHub redirects back to: `/cli/auth?state=xxx&port=1234` (same URL)
5. Page detects authenticated session
6. Page calls `/api/cli/session` to get token
7. Page redirects to: `http://localhost:1234?state=xxx&token=yyy`
8. CLI receives token and completes login

The key insight is that better-auth preserves the `callbackURL` throughout the OAuth flow, so we get back to the same page with the same query parameters after authentication.
