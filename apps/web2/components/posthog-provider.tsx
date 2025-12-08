'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { type ReactElement, type ReactNode, Suspense, useEffect } from 'react'

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
  useEffect(() => {
    initPostHog()
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  )
}
