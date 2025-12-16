'use client'

import { Bot, Terminal } from 'lucide-react'
import Link from 'next/link'

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Kanji } from '../kanji'

export function DashboardPage() {
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
            👋 Meet Kyoto,
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
                    Vibe check your agent written code for bugs, security
                    issues, library usage, and more.
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

          <Link href="/experimental/browser-agents">
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
                    Test your app with agents
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Try our browser agents that run periodic tests on your web
                    applications automatically.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 pt-2 text-sm font-medium text-violet-600 transition-colors group-hover:text-violet-500">
                  <span>Try browser agents</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </CardHeader>
            </Card>
          </Link>
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
