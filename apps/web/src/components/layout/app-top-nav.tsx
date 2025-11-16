'use client'

import { useEffect, useState } from 'react'
import { AppProvider } from '@/components/providers/app-provider'
import { TopNav } from './top-nav'

export function AppTopNav() {
  const [isAppRoute, setIsAppRoute] = useState(false)

  useEffect(() => {
    const checkRoute = () => {
      const pathname = window.location.pathname
      // Show TopNav on app routes: /app, /org/*, /setup, /install
      setIsAppRoute(
        pathname.startsWith('/app') ||
          pathname.startsWith('/org') ||
          pathname.startsWith('/setup') ||
          pathname.startsWith('/install'),
      )
    }

    checkRoute()

    // Listen for navigation events
    const handleNavigation = () => {
      checkRoute()
    }

    window.addEventListener('popstate', handleNavigation)
    document.addEventListener('astro:page-load', handleNavigation)
    document.addEventListener('astro:after-swap', handleNavigation)

    return () => {
      window.removeEventListener('popstate', handleNavigation)
      document.removeEventListener('astro:page-load', handleNavigation)
      document.removeEventListener('astro:after-swap', handleNavigation)
    }
  }, [])

  if (!isAppRoute) {
    return null
  }

  // Wrap TopNav in AppProvider so it has access to all the providers it needs
  return (
    <AppProvider>
      <TopNav data-astro-transition-scope="top-nav" />
    </AppProvider>
  )
}
