import type { Metadata } from 'next'

import { LandingFooter, LandingNavbar } from '@/components/landing'

export const metadata: Metadata = {
  title: 'About - Kyoto',
  description:
    'Learn about Kyoto, the AI-powered intent testing platform born from the Hacker Residency Group in Da Nang, Vietnam.',
}

// About page can be statically generated and cached
export const dynamic = 'force-static'
export const revalidate = 3600 // Revalidate every hour

export default function AboutPage() {
  return (
    <div className="flex flex-col bg-gradient-to-b from-background via-muted/10 to-background text-foreground">
      <LandingNavbar />
      <main>
        <section className="relative border-b border-border/60 bg-background">
          <div className="container grid gap-10 px-6 py-24 sm:px-8 lg:grid-cols-[2fr,3fr] lg:gap-16">
            <div className="space-y-6">
              <p className="text-sm font-semibold tracking-[0.3em] text-primary">
                物語の夜明け
              </p>
              <h1 className="font-display text-4xl tracking-tight text-foreground sm:text-5xl">
                From the beginning,
              </h1>
              <figure className="space-y-4">
                <blockquote className="space-y-4 border-l-2 border-border/60 pl-6 text-base italic text-muted-foreground sm:text-lg">
                  <p>
                    Kyoto was born during the first{' '}
                    <a
                      href="https://www.hackerresidencygroup.com/"
                      className="text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Hacker Residency Group
                    </a>{' '}
                    in Da Nang, Vietnam. But the story began long before that.
                    In 2014 I made my first commit to what became one of the
                    largest developer tools in the world:{' '}
                    <a
                      href="https://codecov.io"
                      className="text-primary hover:underline"
                    >
                      Codecov
                    </a>
                    . My passion for building developer tools and working with
                    my most favorite people in the world has never wavered.
                  </p>
                  <p>
                    At the Hacker Residency Group, I was inspired when talking
                    to other indie hackers about how they are using AI to vibe
                    code but not writing tests. AI has changed developers lives
                    and it shall change testing forever too.
                  </p>
                </blockquote>
                <figcaption className="text-sm font-medium text-muted-foreground">
                  — Steve Peak, Founder
                </figcaption>
              </figure>
            </div>
            {/* TODO show a map of where, some images of the event */}
            <div className="grid gap-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
              <h2 className="font-display text-xl text-foreground">TL;DR</h2>
              <p className="text-muted-foreground">
                Vibe your tests. Kyoto tests them through deep-tracing and
                browser testing.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Founded
                  </p>
                  <p className="text-2xl font-semibold text-foreground">2025</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Customers
                  </p>
                  <p className="text-2xl font-semibold text-foreground">
                    Early partners
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/30 p-4 sm:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Focus
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    Vibe coders who want to vibe tests (without checking in
                    code).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  )
}
