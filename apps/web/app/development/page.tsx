import { notFound } from 'next/navigation'

import { getSession } from '@/lib/auth-server'
import { getUserLogin } from '@/lib/auth-utils'

import { DaytonaSandbox } from './daytona-sandbox'
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
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Daytona Sandbox</h2>
            <DaytonaSandbox />
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Trigger</h2>
            <DevelopmentTrigger />
          </div>
        </div>
      </div>
    </main>
  )
}
