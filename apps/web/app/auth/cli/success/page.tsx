import { auth } from '@/lib/auth'
import { cliAuthStore } from '@/lib/cli-auth-store'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import RedirectToCli from './client-redirect'

export default async function CliLoginSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ state: string }>
}) {
  const { state } = await searchParams
  const session = await auth.api.getSession({
    headers: await headers()
  })

  if (!session) {
    // If not logged in, redirect back to the start flow
    redirect(`/auth/cli?state=${state}`)
  }

  const stored = cliAuthStore.get(state)

  if (!stored) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">
          Session expired or invalid state. Please try running <code>kyoto login</code> again.
        </div>
      </div>
    )
  }

  // Clean up
  cliAuthStore.delete(state)

  return (
    <RedirectToCli 
      port={stored.port} 
      token={session.session.token} 
      state={state}
    />
  )
}
