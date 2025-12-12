import { getSession } from '@/lib/auth-server'

import { CliLoginClient } from './client'

export default async function CliLoginPage(props: {
  searchParams: Promise<{ state: string }>
}) {
  const searchParams = await props.searchParams
  const { state } = searchParams

  if (!state) {
    return <div>Missing state parameter</div>
  }

  const session = await getSession()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <CliLoginClient state={state} session={session} />
    </div>
  )
}
