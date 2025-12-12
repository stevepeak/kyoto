# CLI Login - Quick Start Guide

## What Was Built

A complete GitHub OAuth login flow for the Kyoto CLI that integrates with your web application.

## New Commands

```bash
# Authenticate with GitHub
kyoto login

# Check who you're logged in as
kyoto whoami

# Logout
kyoto logout
```

## How It Works

1. `kyoto login` opens your browser to authenticate via GitHub
2. After OAuth, the web app sends your session token back to the CLI
3. CLI stores the token in memory (lost on process exit, as requested)
4. Other commands can now make authenticated API calls

## Quick Test

```bash
# Start the web app first
cd apps/web && npm run dev

# In another terminal, test the login
kyoto login
# Browser opens, authenticate with GitHub

# Verify you're logged in
kyoto whoami
# Shows your user info

# Logout
kyoto logout
```

## Files Created

**CLI Commands:**
- `apps/cli/src/commands/login.tsx` - Login flow
- `apps/cli/src/commands/logout.tsx` - Logout
- `apps/cli/src/commands/whoami.tsx` - Example authenticated command

**CLI Helpers:**
- `apps/cli/src/helpers/session-storage.ts` - In-memory token storage
- `apps/cli/src/helpers/api-client.ts` - Authenticated HTTP client

**Web Components:**
- `apps/web/app/cli/auth/page.tsx` - OAuth landing page
- `apps/web/app/api/cli/session/route.ts` - Session token API

**Documentation:**
- `docs/cli-authentication.md` - Full technical docs
- `CLI_LOGIN_IMPLEMENTATION.md` - Implementation summary
- `CLI_LOGIN_CHECKLIST.md` - Verification checklist

## Using Authentication in Your Code

```typescript
import { createAuthenticatedClient } from '@/helpers/api-client'

// In any CLI command
const client = createAuthenticatedClient()
if (!client) {
  return <Text color="red">Please run: kyoto login</Text>
}

// Make authenticated requests
const response = await client.get('/api/your-endpoint')
const data = await response.json()
```

## Security Features

✅ CSRF protection via secure random state tokens
✅ State validation on callback
✅ Localhost-only callback server
✅ In-memory session storage (no disk writes)
✅ Proper better-auth integration

## Important Notes

### State Management
The implementation correctly handles better-auth's OAuth flow:
- State tokens are preserved through OAuth via query params
- Better-auth returns to the same URL after GitHub OAuth
- State is validated before accepting tokens

### Storage
As requested, sessions are stored in-memory only (Map). For production:
- Move to persistent storage (`~/.kyoto/credentials`)
- Add encryption (system keychain)
- Implement token refresh

### Environment
Set `KYOTO_WEB_URL` if not using default `http://localhost:3002`

## No Database Changes

✅ Uses existing better-auth session table
✅ No schema modifications
✅ No migrations required

## See Also

- Full technical documentation: `docs/cli-authentication.md`
- Implementation details: `CLI_LOGIN_IMPLEMENTATION.md`
- Verification checklist: `CLI_LOGIN_CHECKLIST.md`

---

**Status:** ✅ Complete and ready for testing
**No TypeScript errors:** ✅
**No linter errors:** ✅
