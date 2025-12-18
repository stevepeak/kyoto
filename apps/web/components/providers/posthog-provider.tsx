'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { type ReactElement, type ReactNode, Suspense, useEffect } from 'react'

import { useSession } from '@/lib/auth-client'
import { getUserLogin } from '@/lib/auth-utils'
import { initPostHog, posthog } from '@/lib/posthog'

function PostHogPageView(): ReactElement | null {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`
      }
      posthog.capture('$pageview', {
        $current_url: url,
      })
    }
  }, [pathname, searchParams])

  return null
}

export function PostHogProvider({
  children,
}: {
  children: ReactNode
}): ReactElement {
  const { data: session } = useSession()

  useEffect(() => {
    initPostHog()
  }, [])

  // Identify the person based on their GitHub login
  useEffect(() => {
    if (session?.user) {
      const login = getUserLogin(session.user)
      posthog.identify(login)
    } else {
      // Reset identification when user logs out
      posthog.reset()
    }
  }, [session?.user])

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  )
}
