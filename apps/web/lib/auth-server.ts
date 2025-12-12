import { headers } from 'next/headers'

import { getAuth } from '@/lib/auth'

export async function getSession() {
  const headersList = await headers()
  const headersForAuth = new Headers()
  for (const [key, value] of headersList.entries()) {
    headersForAuth.set(key, value)
  }

  const sessionResponse = await getAuth().api.getSession({
    headers: headersForAuth,
  })

  return sessionResponse
}
