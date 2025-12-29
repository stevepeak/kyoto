'use client'

import { Bot, Code, MessageCircle, ShieldCheck, Terminal } from 'lucide-react'
import Link from 'next/link'

import { Kanji } from '@/components/display/kanji'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function HomePage() {
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <Kanji
            title="`入` Enter `京` Kyoto `行` to take action towards `改 善` continuous improvement."
            className="mb-2"
          >
            入京行改善
          </Kanji>
          <h1 className="font-cormorant text-5xl font-semibold tracking-tight">
            👋 Hello Kyoto,
          </h1>
          <p className="mt-3 text-lg italic text-muted-foreground">
            Vibe coding tools for the developers of tomorrow.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link href="https://docs.usekyoto.com" target="_blank">
            <Card
              className={cn(
                'group relative h-full cursor-pointer overflow-hidden transition-all duration-300',
                'hover:border-foreground/30 hover:shadow-lg',
                'bg-gradient-to-br from-card via-card to-muted/30',
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <CardHeader className="relative space-y-4 p-8">
                <div className="flex size-14 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 transition-transform duration-300 group-hover:scale-110">
                  <Terminal className="size-7" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-semibold tracking-tight">
                    Kyoto CLI
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Vibe check and test your agent written code for bugs,
                    security issues, library usage, and more. Normal usage of
                    Kyoto CLI and MCP will keep your vibe coding sessions
                    running smoothly.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 pt-2 text-sm font-medium text-emerald-600 transition-colors group-hover:text-emerald-500">
                  <span>Visit docs.usekyoto.com</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/stories">
            <Card
              className={cn(
                'group relative h-full cursor-pointer overflow-hidden transition-all duration-300',
                'hover:border-foreground/30 hover:shadow-lg',
                'bg-gradient-to-br from-card via-card to-muted/30',
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <CardHeader className="relative space-y-4 p-8">
                <div className="flex size-14 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 transition-transform duration-300 group-hover:scale-110">
                  <Bot className="size-7" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-semibold tracking-tight">
                    User story testing
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Launch agents that run periodic user story tests in the{' '}
                    <b>browser</b> or a <b>virtual machine</b> to test your
                    website, cli, or api to ensuring functionality is working as
                    expected.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 pt-2 text-sm font-medium text-violet-600 transition-colors group-hover:text-violet-500">
                  <span>User story testing</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/security-audits">
            <Card
              className={cn(
                'group relative h-full cursor-pointer overflow-hidden transition-all duration-300',
                'hover:border-foreground/30 hover:shadow-lg',
                'bg-gradient-to-br from-card via-card to-muted/30',
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <CardHeader className="relative space-y-4 p-8">
                <div className="flex size-14 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 transition-transform duration-300 group-hover:scale-110">
                  <ShieldCheck className="size-7" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-semibold tracking-tight">
                    Regular Security Audits
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Comprehensive automated security audits using AI agents.
                    Verify HTTPS, headers, authentication, database security,
                    dependencies, and more.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 pt-2 text-sm font-medium text-orange-600 transition-colors group-hover:text-orange-500">
                  <span>Security audits</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </CardHeader>
            </Card>
          </Link>

          {/* <Link href="/vibe-prompts">
            <Card
              className={cn(
                'group relative h-full cursor-pointer overflow-hidden transition-all duration-300',
                'hover:border-foreground/30 hover:shadow-lg',
                'bg-gradient-to-br from-card via-card to-muted/30',
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <CardHeader className="relative space-y-4 p-8">
                <div className="flex size-14 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 transition-transform duration-300 group-hover:scale-110">
                  <FileText className="size-7" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-semibold tracking-tight">
                    Vibe prompts
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Free prompts that improve your vibe coding experience.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 pt-2 text-sm font-medium text-blue-600 transition-colors group-hover:text-blue-500">
                  <span>Explore prompts</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </CardHeader>
            </Card>
          </Link> */}

          <Link
            href="https://github.com/stevepeak/kyoto-template"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Card
              className={cn(
                'group relative h-full cursor-pointer overflow-hidden transition-all duration-300',
                'hover:border-foreground/30 hover:shadow-lg',
                'bg-gradient-to-br from-card via-card to-muted/30',
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-rose-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <CardHeader className="relative space-y-4 p-8">
                <div className="flex size-14 items-center justify-center rounded-xl bg-red-500/10 text-red-600 transition-transform duration-300 group-hover:scale-110">
                  <Code className="size-7" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-semibold tracking-tight">
                    Vibe coding git template
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    A git repository template with all the build-in stuff for
                    creating a Next.js web app, workflows, CLI, with sample
                    packages for agents, and amazing tooling with Bun.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 pt-2 text-sm font-medium text-red-600 transition-colors group-hover:text-red-500">
                  <span>View template</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link
            href="https://timetuna.com/stevepeak"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Card
              className={cn(
                'group relative h-full cursor-pointer overflow-visible transition-all duration-300',
                'hover:border-foreground/30 hover:shadow-lg',
                'bg-gradient-to-br from-card via-card to-muted/30',
              )}
            >
              <div className="absolute inset-0 overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="absolute -top-3 right-4 z-10">
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-500">
                  Kyoto Pro or Max plan required
                </span>
              </div>
              <CardHeader className="relative space-y-4 p-8">
                <div className="flex size-14 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 transition-transform duration-300 group-hover:scale-110">
                  <MessageCircle className="size-7" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-semibold tracking-tight">
                    Consult with us
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Book a consultation with Steve (founder of Kyoto and
                    Codecov) on vibe coding and best development practices. Get
                    personalized guidance on improving your development
                    workflow.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 pt-2 text-sm font-medium text-amber-600 transition-colors group-hover:text-amber-500">
                  <span>Book consultation</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </CardHeader>
            </Card>
          </Link>

          {/* <Card
            className={cn(
              'group relative h-full overflow-hidden transition-all duration-300',
              'bg-gradient-to-br from-card via-card to-muted/30',
              'opacity-75',
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 opacity-0" />
            <CardHeader className="relative space-y-4 p-8">
              <div className="flex size-14 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <BookOpen className="size-7" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  User behavior wiki
                </CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Generate a user behavior wiki by having an ai navigate around
                  your product exploring tools and features.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 pt-2 text-sm font-medium text-muted-foreground">
                <span>Coming soon</span>
              </div>
            </CardHeader>
          </Card> */}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          <span className="text-red-800">入</span>{' '}
          <span className="font-semibold">Kyoto</span> is{' '}
          <a
            href="https://github.com/stevepeak/kyoto"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            open source
          </a>{' '}
          by{' '}
          <a
            href="https://x.com/iopeak"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            @iopeak
          </a>{' '}
          (Founder of{' '}
          <a
            href="https://codecov.io"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Codecov
          </a>
          ).
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Inspired and initially demoed at{' '}
          <a
            href="https://hackerresidency.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Hacker Residency Group
          </a>{' '}
          in Da Nang, Vietnam 2025.
        </p>
      </div>
    </div>
  )
}
