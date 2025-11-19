import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { SetupInstallAppWrapper } from '@/components/apps/setup-install-app-wrapper'
import { getAuth } from '@/lib/auth'
import { setupDb } from '@app/db/db'
import { getUser } from '@app/api/helpers/users'

// Setup page is user-specific and always dynamic
export const dynamic = 'force-dynamic'
export const dynamicParams = true

function hasCompletedOnboarding(onboardingMetadata: unknown): boolean {
  if (!onboardingMetadata || typeof onboardingMetadata !== 'object') {
    return false
  }

  const metadata = onboardingMetadata as Record<string, unknown>
  return (
    typeof metadata.customerType === 'string' &&
    typeof metadata.currentTesting === 'string' &&
    typeof metadata.goals === 'string' &&
    typeof metadata.brokenFeature === 'string' &&
    typeof metadata.writtenUserStories === 'boolean'
  )
}

/**
 * SetupPage handles the post-authentication setup or app installation redirect.
 *
 * - If `installation_id` is present in the query params, renders the installation flow for the app.
 * - Otherwise, validates session and checks onboarding status:
 *   - If onboarding is incomplete, redirects to `/onboarding`
 *   - If onboarding is complete, redirects to the main app (`/app`).
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
      return <SetupInstallAppWrapper installationId={installationId} />
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

  let session
  try {
    session = await auth.api.getSession({
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

  // Check onboarding status
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }

  const db = setupDb(connectionString)
  const user = await getUser({
    db,
    userId: session.user.id,
  })

  // Check if user has completed onboarding
  const userWithMetadata = user as { onboardingMetadata?: unknown }
  if (!hasCompletedOnboarding(userWithMetadata.onboardingMetadata)) {
    redirect('/onboarding')
  }

  // Session is valid and onboarding is complete, redirect to /app
  redirect('/app')
}
