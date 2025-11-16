import { redirect } from 'next/navigation'
import { SetupInstallAppWrapper } from '@/components/apps/setup-install-app-wrapper'

// Setup page is user-specific and always dynamic
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ installation_id?: string }>
}) {
  const params = await searchParams
  const installationIdParam = params.installation_id

  // If installation_id is provided, use the install flow
  if (installationIdParam) {
    const installationId = parseInt(installationIdParam, 10)
    if (!isNaN(installationId)) {
      return <SetupInstallAppWrapper installationId={installationId} />
    }
  }

  // Redirect to /app
  redirect('/app')
}
