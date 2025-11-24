import { FileDiff, FileText, MessageCircle } from 'lucide-react'

import { AppLayout } from '@/components/layout'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type ChangelogStoryStatus = 'new' | 'updated' | 'unchanged' | 'at-risk'

interface ChangelogStory {
  id: string
  title: string
  status: ChangelogStoryStatus
  area: string
  summary: string
  evidence: string
}

interface ChangelogSection {
  title: string
  items: string[]
}

interface PullRequestSummary {
  number: number
  title: string
  branch: string
  fileCount: number
  additions: number
  deletions: number
}

interface DiscoverStoriesFromCommitsNewStory {
  title: string
  text: string
  scope: string
}

interface DiscoverStoriesFromCommitsChangedStoryExistingStory {
  id: string
  name: string
  story: string
}

interface DiscoverStoriesFromCommitsChangedStory {
  existingStory: DiscoverStoriesFromCommitsChangedStoryExistingStory
  rewrittenStory: string
  scope: string[]
}

interface DiscoverStoriesFromCommitsSavedStory {
  id: string
  name: string
  story: string
}

interface DiscoverStoriesFromCommitsResult {
  codeDiff: string
  changedFiles: string[]
  commitMessages: string[]
  scopeItems: string[]
  newStories: DiscoverStoriesFromCommitsNewStory[]
  changedStories: DiscoverStoriesFromCommitsChangedStory[]
  savedStories: DiscoverStoriesFromCommitsSavedStory[]
}

interface ChangelogSummaryMeta {
  filesChanged: number
  additions: number
  deletions: number
}

interface ChangelogSummaryData {
  title: string
  subtitle: string
  sections: ChangelogSection[]
  meta: ChangelogSummaryMeta
}

interface StoriesPanelData {
  title: string
  subtitle: string
  stories: ChangelogStory[]
  summaryNote: string
}

interface ChangelogPageData {
  pullRequest: PullRequestSummary
  changelogSummary: ChangelogSummaryData
  storiesPanel: StoriesPanelData
  workflowResult: DiscoverStoriesFromCommitsResult
}

const SAMPLE_WORKFLOW_RESULT: DiscoverStoriesFromCommitsResult = {
  codeDiff: `diff --git a/components/checkout/CheckoutForm.tsx b/components/checkout/CheckoutLayout.tsx
index 4b825dc..d3e8b6a 100644
--- a/components/checkout/CheckoutForm.tsx
+++ b/components/checkout/CheckoutLayout.tsx
@@ -1,6 +1,10 @@
-export function CheckoutForm() {
-  // legacy imperative form logic
-}
+export function CheckoutLayout() {
+  // declarative, step-based checkout layout
+}
`,
  changedFiles: [
    'components/checkout/CheckoutLayout.tsx',
    'components/checkout/EmailStep.tsx',
    'components/checkout/OrderSummary.tsx',
    'pages/api/orders/preview.ts',
  ],
  commitMessages: [
    'Refactor checkout flow into layout components',
    'Add order preview endpoint and regression checks',
  ],
  scopeItems: [
    'Checkout flow layout and step navigation',
    'Order summary before payment',
    'Guest email persistence across steps',
    'Payment failure error state',
  ],
  newStories: [
    {
      title: 'Payment failure surfaces a clear error state',
      text:
        'When a payment attempt fails, the shopper sees a clear, actionable error message and can retry with a different method.',
      scope: 'Payment failure error state',
    },
  ],
  changedStories: [
    {
      existingStory: {
        id: 'story-guest-email',
        name: 'Guest checkout remembers email',
        story:
          'When a guest enters their email at checkout, it is remembered while they complete the flow.',
      },
      rewrittenStory:
        'When a guest enters their email at checkout, it is remembered even if they navigate back and forth between steps or refresh the page.',
      scope: ['Guest email persistence across steps'],
    },
    {
      existingStory: {
        id: 'story-order-summary',
        name: 'User sees order summary before paying',
        story:
          'Before paying, the shopper sees an order summary with items, quantities, prices, and totals.',
      },
      rewrittenStory:
        'Before paying, the shopper sees an updated order summary with items, quantities, discounts, taxes, shipping, and a final total.',
      scope: ['Order summary before payment'],
    },
  ],
  savedStories: [
    {
      id: 'story-payment-failure',
      name: 'Payment failure surfaces a clear error state',
      story:
        'When a payment attempt fails, the shopper sees a clear, actionable error message and can retry with a different method.',
    },
  ],
}

function buildSampleChangelogData(): ChangelogPageData {
  return {
    pullRequest: {
      number: 482,
      title: 'Refactor checkout flow',
      branch: 'feature/intent-checkout',
      fileCount: 17,
      additions: 243,
      deletions: 98,
    },
    changelogSummary: {
      title: 'Changelog summary',
      subtitle: 'AI-generated overview of what changed in this pull request.',
      sections: [
        {
          title: 'Checkout flow',
          items: [
            'Refactored <CheckoutForm> into <CheckoutLayout> for clearer steps',
            'Moved payment validation into shared hook usePaymentGuard',
          ],
        },
        {
          title: 'API',
          items: [
            'Added POST /orders/preview to support order summaries',
            'Deprecated /cart/lock in favor of /cart/hold',
          ],
        },
        {
          title: 'Tests',
          items: [
            'Updated intent story “guest checkout remembers email”',
            'Added regression check for order summary totals',
          ],
        },
      ],
      meta: {
        filesChanged: 17,
        additions: 243,
        deletions: 98,
      },
    },
    storiesPanel: {
      title: 'Stories in this pull request',
      subtitle: 'Stories that this changelog touches.',
      stories: [
        {
          id: 'story-guest-email',
          title: 'Guest checkout remembers email',
          status: 'updated',
          area: 'Checkout',
          summary:
            'When a guest enters their email at checkout, it is remembered even if they navigate back and forth between steps.',
          evidence: 'components/checkout/EmailStep.tsx:18-54',
        },
        {
          id: 'story-order-summary',
          title: 'User sees order summary before paying',
          status: 'new',
          area: 'Checkout',
          summary:
            'Before paying, the shopper sees a clear order summary with totals that update as items change.',
          evidence: 'components/checkout/OrderSummary.tsx:12-80',
        },
        {
          id: 'story-payment-failure',
          title: 'Payment failure surfaces a clear error state',
          status: 'at-risk',
          area: 'Payments',
          summary:
            'If a payment attempt fails, the shopper sees a clear error message and can retry or pick a different method.',
          evidence: 'components/checkout/PaymentStep.tsx:40-96',
        },
      ],
      summaryNote:
        'Kyoto mapped 2 existing stories, discovered 1 new intent, and marked 1 at risk.',
    },
    workflowResult: SAMPLE_WORKFLOW_RESULT,
  }
}

interface ChangelogAppProps {
  orgName: string
  repoName: string
}

export function ChangelogApp({ orgName, repoName }: ChangelogAppProps) {
  const data = buildSampleChangelogData()

  return (
    <AppLayout
      breadcrumbs={[
        { label: orgName, href: `/org/${orgName}` },
        { label: repoName, href: `/org/${orgName}/repo/${repoName}` },
        {
          label: 'Changelog',
          href: `/org/${orgName}/repo/${repoName}/changelog`,
        },
      ]}
    >
      <main className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl flex-col gap-8 px-6 py-10 lg:py-16">
        <header className="rounded-3xl border border-border/70 bg-card/80 px-6 py-5 shadow-lg">
          <p className="text-xs font-semibold tracking-[0.3em] text-primary">
            Pull Request #{data.pullRequest.number}
          </p>
          <h1 className="mt-2 font-display text-2xl text-foreground sm:text-3xl">
            {data.pullRequest.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            branch{' '}
            <span className="font-mono text-xs">
              {data.pullRequest.branch}
            </span>{' '}
            · {data.pullRequest.fileCount} files
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <ChangelogSummaryCard
            summary={data.changelogSummary}
            workflowResult={data.workflowResult}
          />
          <StoriesPanel
            orgName={orgName}
            repoName={repoName}
            storiesPanel={data.storiesPanel}
          />
        </section>

        <p className="mt-2 text-xs text-muted-foreground">
          {data.storiesPanel.summaryNote}
        </p>
      </main>
    </AppLayout>
  )
}

interface ChangelogSummaryCardProps {
  summary: ChangelogSummaryData
  workflowResult: DiscoverStoriesFromCommitsResult
}

function ChangelogSummaryCard({
  summary,
  workflowResult,
}: ChangelogSummaryCardProps) {
  return (
    <Card className="relative overflow-hidden border-border/70 bg-card/80 shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <FileDiff className="size-5" />
              </span>
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-accent/30 text-accent-foreground">
                <FileText className="size-5" />
              </span>
            </div>
            <p
              className="text-xs font-semibold tracking-[0.3em] text-primary"
              title="Henkōroku - Change log."
            >
              変更ログ
            </p>
            <CardTitle className="text-lg">
              {summary.title}
            </CardTitle>
            <CardDescription>{summary.subtitle}</CardDescription>
          </div>
          <CardAction className="mt-1 flex flex-col items-end gap-1 text-xs text-muted-foreground">
            <span>
              {summary.meta.filesChanged} files
            </span>
            <span>
              +{summary.meta.additions} / -{summary.meta.deletions}
            </span>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {summary.sections.map((section) => (
          <section key={section.title} className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              {section.title}
            </h3>
            <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}

        {workflowResult.scopeItems.length > 0 && (
          <section className="mt-2 space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Scopes detected
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {workflowResult.scopeItems.map((scope) => (
                <span
                  key={scope}
                  className="inline-flex items-center rounded-full bg-muted px-2 py-[3px] text-[10px] font-medium text-muted-foreground"
                >
                  {scope}
                </span>
              ))}
            </div>
          </section>
        )}
      </CardContent>
      <CardFooter className="mt-2 flex items-center justify-between border-t border-dashed border-border/60 pt-4 text-xs">
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm">
            View raw diff
          </Button>
          <Button variant="ghost" size="sm">
            Copy summary
          </Button>
        </div>
        <div className="text-muted-foreground">
          {summary.meta.filesChanged} files · +{summary.meta.additions} / -
          {summary.meta.deletions}
        </div>
      </CardFooter>
    </Card>
  )
}

interface StoriesPanelProps {
  orgName: string
  repoName: string
  storiesPanel: StoriesPanelData
}

function StoriesPanel({ orgName, repoName, storiesPanel }: StoriesPanelProps) {
  return (
    <Card className="relative overflow-hidden border-border/70 bg-card/80 shadow-lg">
      <CardHeader>
        <div className="space-y-3">
          <div className="inline-flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageCircle className="size-5" />
            </span>
          </div>
          <p
            className="text-xs font-semibold tracking-[0.3em] text-primary"
            title="Yūzā sutōrī - User stories."
          >
            ユーザーストーリー
          </p>
          <CardTitle className="text-lg">{storiesPanel.title}</CardTitle>
          <CardDescription>{storiesPanel.subtitle}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {storiesPanel.stories.map((story) => (
          <article
            key={story.id}
            className="border-t border-dashed border-border/60 pt-4 first:border-t-0 first:pt-0"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-medium">
              <StoryStatusPill status={story.status} />
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-[3px] text-[10px] font-medium text-muted-foreground">
                {story.area}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              {story.title}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {story.summary}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Evidence:{' '}
              <span className="font-mono">{story.evidence}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <a
                  href={`/org/${orgName}/repo/${repoName}/stories/${story.id}`}
                >
                  View story
                </a>
              </Button>
              <Button size="sm" variant="ghost">
                See test run
              </Button>
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  )
}

interface StoryStatusPillProps {
  status: ChangelogStoryStatus
}

function StoryStatusPill({ status }: StoryStatusPillProps) {
  const label =
    status === 'new'
      ? 'New'
      : status === 'updated'
        ? 'Updated'
        : status === 'at-risk'
          ? 'At risk'
          : 'Unchanged'

  const className =
    status === 'new'
      ? 'border-chart-1/40 bg-chart-1/15 text-chart-1'
      : status === 'updated'
        ? 'border-secondary/40 bg-secondary/10 text-secondary-foreground'
        : status === 'at-risk'
          ? 'border-destructive/40 bg-destructive/10 text-destructive'
          : 'border-border bg-muted text-muted-foreground'

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-[3px] text-[10px] font-medium ${className}`}
    >
      {label}
    </span>
  )
}
