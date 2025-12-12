import { redirect } from 'next/navigation'

import { getSession } from '@/lib/auth-server'
import { getUserLogin } from '@/lib/auth-utils'
import { cliAuthStore } from '@/lib/cli-auth-store'

/**
 * CLI OAuth callback page
 * This page is reached after successful GitHub OAuth
 * It completes the CLI session with the session token
 */
export default async function CliCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  const params = await searchParams
  const state = params.state

  // If no state, this wasn't a CLI login
  if (!state) {
    redirect('/')
  }

  try {
    // Get the current session from better-auth
    const session = await getSession()

    if (!session?.session || !session?.user) {
      // No session, redirect to error
      redirect(
        `/cli/error?message=${encodeURIComponent('Authentication failed')}`,
      )
    }

    const login = getUserLogin(session.user)

    // Complete the CLI session
    cliAuthStore.completeSession(state, session.session.token, {
      name: session.user.name,
      login,
    })

    // Redirect to success page
    redirect(`/cli/success?login=${encodeURIComponent(login)}`)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred'
    redirect(`/cli/error?message=${encodeURIComponent(message)}`)
  }
}
