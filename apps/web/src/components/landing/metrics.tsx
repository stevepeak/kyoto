export function Metrics() {
  return (
    <section className="bg-background py-24 sm:py-28">
      <div className="container grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-3xl border border-dashed border-border/60 bg-muted/40">
          <img
            src="/github-status.png"
            alt="Kyoto status checks showing green passes for CI integrations."
            className="size-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="space-y-4">
          <p
            className="text-sm font-semibold tracking-[0.3em] text-primary"
            title="Ito o motte tsukurareta — Made with intention"
          >
            意図をもって作られた
          </p>
          <h3 className="font-display text-3xl text-foreground sm:text-4xl">
            Kyoto tests intent.
          </h3>
          <p className="text-base text-muted-foreground sm:text-lg">
            Kyoto weaves into your existing checks. Not replacing other tools,
            but complementing them.
          </p>
          <p className="text-sm text-muted-foreground">
            Our beloved CI tools test code quality, test coverage, security, and
            more. While Kyoto tests user stories and ensures the code works as
            expected by reading and understanding the intent of your code. We
            call this &quot;Intent Testing&quot;.
          </p>
        </div>
      </div>
    </section>
  )
}
