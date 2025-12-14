import { type Metadata } from 'next'

import { LoginClient } from './login-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sign in - Kyoto',
  description: 'Sign in to Kyoto',
}

export default async function LoginPage(props: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const searchParams = await props.searchParams
  const redirectTo = searchParams.redirect || '/~'

  return <LoginClient redirectTo={redirectTo} />
}
