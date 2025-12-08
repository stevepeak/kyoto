import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { SetupPageWrapper } from '@/components/pages/SetupPageWrapper'
import { getAuth } from '@/lib/auth'

// Setup page is user-specific and always dynamic
export const dynamic = 'force-dynamic'
export const dynamicParams = true

/**
 * SetupPage handles the post-authentication setup or app installation redirect.
 *
 * - If `installation_id` is present in the query params, renders the installation flow for the app.
 * - Otherwise, validates session and redirects the user to the main app (`/app`).
 *
 * @param searchParams - Promise resolving to an object with an optional `installation_id` field from the query string.
 * @returns JSX element for installation flow or a redirect; never undefined.
 */
export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ installation_id?: string }>
}) {
  const params = await searchParams
  const installationIdParam = params.installation_id

  // If installation_id is provided, use the install flow
  if (installationIdParam) {
    const installationId = Number.parseInt(installationIdParam, 10)
    if (!Number.isNaN(installationId)) {
      return <SetupPageWrapper installationId={installationId} />
    }
  }

  // Validate session before redirecting
  // This ensures the user is actually authenticated before going to /app
  const auth = getAuth()
  const headersList = await headers()
  const headersForAuth = new Headers()
  for (const [key, value] of headersList.entries()) {
    headersForAuth.set(key, value)
  }

  try {
    const session = await auth.api.getSession({
      headers: headersForAuth,
    })

    // If no valid session, redirect to auth page
    if (!session?.user) {
      redirect('/auth?redirect=/setup')
    }
  } catch {
    // If session check fails, redirect to auth page
    redirect('/auth?redirect=/setup')
  }

  // Session is valid, redirect to /app
  redirect('/app')
}
