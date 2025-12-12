'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function RedirectToCli({ port, token, state }: { port: string, token: string, state: string }) {
  const [status, setStatus] = useState('Redirecting to CLI...')
  
  useEffect(() => {
    const target = `http://localhost:${port}/callback?token=${token}&state=${state}`
    window.location.href = target
  }, [port, token, state])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
       <Card>
         <CardHeader>
           <CardTitle>{status}</CardTitle>
         </CardHeader>
         <CardContent>
           <p>If you are not redirected automatically, <a href={`http://localhost:${port}/callback?token=${token}&state=${state}`} className="text-blue-500 underline">click here</a>.</p>
         </CardContent>
       </Card>
    </div>
  )
}
