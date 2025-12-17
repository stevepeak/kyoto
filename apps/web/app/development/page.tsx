import { notFound } from 'next/navigation'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession } from '@/lib/auth-server'
import { getUserLogin } from '@/lib/auth-utils'

import { DaytonaSandbox } from './daytona-sandbox'
import { DevelopmentTrigger } from './development-trigger'
import { ReactGrabHint } from './react-grab-hint'

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
          <Card>
            <CardHeader>
              <CardTitle>React Grab</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactGrabHint />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Daytona Sandbox</CardTitle>
            </CardHeader>
            <CardContent>
              <DaytonaSandbox />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Trigger</CardTitle>
            </CardHeader>
            <CardContent>
              <DevelopmentTrigger />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
