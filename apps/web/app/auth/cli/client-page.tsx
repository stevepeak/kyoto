'use client'

import { useSession, signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useState } from 'react'

export default function CliLoginClient({ state }: { state: string }) {
  const { data: session, isPending } = useSession()
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    await signIn.social({
      provider: 'github',
      callbackURL: `/auth/cli/success?state=${state}`,
    })
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Kyoto CLI Login</CardTitle>
          <CardDescription>
            {session 
              ? `Authorize CLI to access your account as ${session.user.name}` 
              : 'Log in to authorize the Kyoto CLI'}
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Button 
             className="w-full" 
             onClick={handleLogin} 
             disabled={loading || isPending}
           >
             {session ? 'Authorize CLI' : 'Log in with GitHub'}
           </Button>
        </CardContent>
      </Card>
    </div>
  )
}
