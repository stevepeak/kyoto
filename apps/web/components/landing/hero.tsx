'use client'

import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

import { GitHubSignInButton } from '@/components/features/auth/github-sign-in-button'

export function LandingHero() {
  return (
    <section className="relative min-h-[90vh] overflow-hidden pt-8 pb-20 sm:pt-10 sm:pb-24 lg:pt-12 lg:pb-32">
      <div className="absolute inset-0">
        <Image
          src="/kyoto.png"
          alt=""
          fill
          className="object-cover object-left-bottom"
          priority
          sizes="100vw"
        />
      </div>
      <div className="container relative z-10 flex flex-col gap-12 px-6 pt-4 pb-12 lg:flex-row lg:items-center lg:justify-between lg:pb-16">
        <div className="max-w-xl space-y-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-background/70 px-4 py-1 text-sm font-medium text-muted-foreground">
            👋 Meet Kyoto, from the creators of Codecov
          </span>
          <h1 className="font-display text-4xl tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Ship it working.
          </h1>
          <p className="max-w-prose text-lg text-muted-foreground sm:text-xl">
            Kyoto is first <b>intent testing</b> platform using AI agents that
            evaluate user stories by tracing code execution paths so you can
            prevent regressions and ship with confidence.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <GitHubSignInButton size="lg" className="gap-2">
              Get started
              <ArrowRight className="size-4" />
            </GitHubSignInButton>
            {/* <Button
              size="lg"
              variant="outline"
              className="border-primary/30 bg-background/60 backdrop-blur"
              asChild
            >
              <a href="/demo" className="gap-2">
                <PlayCircle className="size-4" />
                Watch platform tour
              </a>
            </Button> */}
          </div>
        </div>
      </div>
    </section>
  )
}
