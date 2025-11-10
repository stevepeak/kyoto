import { ArrowRight, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LandingHero() {
  return (
    <section
      className="relative min-h-[90vh] overflow-hidden bg-cover bg-left-bottom bg-no-repeat pt-8 pb-20 sm:pt-10 sm:pb-24 lg:pt-12 lg:pb-32"
      style={{ backgroundImage: "url('/kyoto.png')" }}
    >
      <div className="container flex flex-col gap-12 px-6 pt-4 pb-12 lg:flex-row lg:items-center lg:justify-between lg:pb-16">
        <div className="max-w-xl space-y-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-background/70 px-4 py-1 text-sm font-medium text-muted-foreground">
            👋 Hello Kyoto
          </span>
          <h1 className="font-display text-4xl tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Ship it working.
          </h1>
          <p className="max-w-prose text-lg text-muted-foreground sm:text-xl">
            Test your code without writing tests. Kyoto tests your code
            functionality to prevent regressions by writing and evaluating your
            user stories.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <a href="/auth" className="gap-2">
                Get started
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary/30 bg-background/60 backdrop-blur"
              asChild
            >
              <a href="/demo" className="gap-2">
                <PlayCircle className="size-4" />
                Watch platform tour
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
