import { redirect } from 'next/navigation'

import {
  registerPendingCliLogin,
  validateLoopbackRedirectUri,
} from '@/lib/cli-auth'

import { CliLoginClient } from './cli-login-client'

export const dynamic = 'force-dynamic'

export default async function CliLoginPage(props: {
  searchParams: Promise<{ state?: string; redirect_uri?: string }>
}) {
  const searchParams = await props.searchParams
  const state = searchParams.state?.trim()
  const redirectUri = searchParams.redirect_uri?.trim()

  if (!state || !redirectUri) {
    redirect('/')
  }

  // Validate and register (state -> redirectUri) so the callback can't be tampered with.
  const redirectUrl = validateLoopbackRedirectUri(redirectUri)
  await registerPendingCliLogin({
    state,
    redirectUri: redirectUrl.toString(),
  })

  return (
    <div className="container mx-auto">
      <CliLoginClient state={state} />
    </div>
  )
}
