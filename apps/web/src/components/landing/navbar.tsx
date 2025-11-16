'use client'

import { navigate } from 'astro:transitions/client'

import { useSession } from '@/client/auth-client'
import { GitHubSignInButton } from '@/components/github-sign-in-button'
import { Button } from '@/components/ui/button'

export function LandingNavbar() {
  const session = useSession()
  const isLoggedIn = session.data?.user && !session.isPending

  const handleEnterKyoto = () => {
    void navigate('/app')
  }

  return (
    <header className="relative z-20 border-b border-border/60 bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex flex-col items-center gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-lg font-semibold text-foreground"
          data-astro-prefetch
        >
          <span aria-hidden="true" className="text-xl">
            ⛩️
          </span>
          <span className="font-display">Kyoto</span>
        </a>
        <nav className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 md:gap-8 text-sm font-medium text-muted-foreground">
          <a
            href="/#product"
            className="transition-colors hover:text-foreground focus-visible:text-foreground"
            data-astro-prefetch
          >
            Product
          </a>
          <a
            href="#/pricing"
            className="transition-colors hover:text-foreground focus-visible:text-foreground"
            data-astro-prefetch
          >
            Pricing
          </a>
          <a
            href="/about"
            className="transition-colors hover:text-foreground focus-visible:text-foreground"
            data-astro-prefetch
          >
            About
          </a>
        </nav>
        <div className="w-full sm:w-auto">
          {isLoggedIn ? (
            <Button
              size="sm"
              onClick={handleEnterKyoto}
              className="w-full sm:w-auto gap-2"
            >
              Enter Kyoto
            </Button>
          ) : (
            <GitHubSignInButton size="sm" className="w-full sm:w-auto gap-2" />
          )}
        </div>
      </div>
    </header>
  )
}
