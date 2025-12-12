import { notFound } from 'next/navigation'

import { getSession } from '@/lib/auth-server'
import { getUserLogin } from '@/lib/auth-utils'

import { DevelopmentTrigger } from './development-trigger'

export default async function DevelopmentPage() {
  const session = await getSession()
  const userLogin = session?.user ? getUserLogin(session.user) : null

  if (userLogin !== 'stevepeak') {
    notFound()
  }

  return (
    <main className="container mx-auto min-h-screen py-12">
      <div className="flex flex-col items-center justify-center gap-8">
        <h1 className="text-2xl font-semibold">Development</h1>
        <DevelopmentTrigger />
      </div>
    </main>
  )
}
