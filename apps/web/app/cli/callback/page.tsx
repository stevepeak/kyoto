import { redirect } from 'next/navigation'

import { getSession } from '@/lib/auth-server'
import { getUserLogin } from '@/lib/auth-utils'
import { consumePendingCliLogin, createCliSession } from '@/lib/cli-auth'

export const dynamic = 'force-dynamic'

export default async function CliCallbackPage(props: {
  searchParams: Promise<{ state?: string }>
}) {
  const searchParams = await props.searchParams
  const state = searchParams.state?.trim()

  if (!state) {
    return (
      <div className="container mx-auto py-16">
        <h1 className="text-2xl font-semibold">CLI login failed</h1>
        <p className="mt-2 text-muted-foreground">Missing state.</p>
      </div>
    )
  }

  const session = await getSession()
  if (!session?.user?.id) {
    return (
      <div className="container mx-auto py-16">
        <h1 className="text-2xl font-semibold">CLI login failed</h1>
        <p className="mt-2 text-muted-foreground">
          You are not signed in. Please go back and retry the login flow.
        </p>
      </div>
    )
  }

  let pending: { redirectUri: string }
  try {
    pending = consumePendingCliLogin({ state })
  } catch (e) {
    return (
      <div className="container mx-auto py-16">
        <h1 className="text-2xl font-semibold">CLI login failed</h1>
        <p className="mt-2 text-muted-foreground">
          {e instanceof Error ? e.message : 'State not found or expired.'}
        </p>
      </div>
    )
  }

  const cliSession = createCliSession({
    userId: session.user.id,
    login: getUserLogin(session.user),
  })

  const url = new URL(pending.redirectUri)
  url.searchParams.set('token', cliSession.token)
  url.searchParams.set('state', state)
  url.searchParams.set('login', cliSession.login)

  redirect(url.toString())
}
