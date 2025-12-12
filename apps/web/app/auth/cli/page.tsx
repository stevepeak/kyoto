import { cliAuthStore } from '@/lib/cli-auth-store'
import CliLoginClient from './client-page'

export default async function CliLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ state: string; port: string }>
}) {
  const { state, port } = await searchParams

  if (!state || !port) {
    return <div>Invalid request: Missing state or port</div>
  }

  // Store mapping
  cliAuthStore.set(state, { port, timestamp: Date.now() })

  return <CliLoginClient state={state} />
}
