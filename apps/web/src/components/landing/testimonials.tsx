import { stories } from './content'

export function Testimonials() {
  return (
    <section className="bg-linear-to-b from-muted/30 via-background to-background py-24 sm:py-28">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-[0.3em] text-primary">
            お客様の物語
          </p>
          <h2 className="mt-4 font-display text-3xl text-foreground sm:text-4xl">
            Example User Stories
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Natural language tests can be written in any language or format.
            Here are some examples.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {stories.map((story) => (
            <figure
              key={story.quote}
              className="rounded-3xl border border-border/60 bg-card/70 p-8 shadow-lg transition hover:border-primary/30 hover:shadow-xl"
            >
              <blockquote className="text-lg text-foreground">
                {story.quote}
              </blockquote>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
