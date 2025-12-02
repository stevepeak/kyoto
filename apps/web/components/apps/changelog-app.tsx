'use client'

import { useState, useEffect } from 'react'
import { Copy, GitBranch, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { codeToHtml } from 'shiki'

import { AppLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TiptapEditor } from '@/components/ui/tiptap-editor'

function XLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

type ChangelogStoryStatus = 'new' | 'updated' | 'unchanged' | 'at-risk'

type StoryAction = 'accepted' | 'ignored' | null

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
  author: {
    username: string
    avatarUrl: string
  }
}

interface DiscoverStoriesFromCommitsResult {
  scopeItems: string[]
}

interface ChangelogSummaryData {
  sections: ChangelogSection[]
}

interface StoriesPanelData {
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
  scopeItems: ['Checkout Flow', 'Oauth'],
}

function buildSampleChangelogData(): ChangelogPageData {
  const pullRequestNumber = 482
  return {
    pullRequest: {
      number: pullRequestNumber,
      title: 'Refactor checkout flow',
      branch: 'feature/intent-checkout',
      author: {
        username: 'stevepeak',
        avatarUrl: 'https://avatars.githubusercontent.com/u/2041757?v=4',
      },
    },
    changelogSummary: {
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
            'Updated intent story "guest checkout remembers email"',
            'Added regression check for order summary totals',
          ],
        },
      ],
    },
    storiesPanel: {
      stories: [
        {
          id: 'story-guest-email',
          title: 'Guest checkout remembers email',
          status: 'updated',
          area: 'Checkout',
          summary:
            'When a guest enters their email at checkout, it is **remembered** even if they navigate back and forth between steps or refresh the page.',
          evidence: 'components/checkout/EmailStep.tsx:18-54',
        },
        {
          id: 'story-order-summary',
          title: 'User sees order summary before paying',
          status: 'new',
          area: 'Checkout',
          summary:
            'Before paying, the shopper sees a clear order summary with:\n\n- Items and quantities\n- Totals that **update** as items change\n- Discounts and shipping costs',
          evidence: 'components/checkout/OrderSummary.tsx:12-80',
        },
        {
          id: 'story-payment-failure',
          title: 'Payment failure surfaces a clear error state',
          status: 'at-risk',
          area: 'Payments',
          summary:
            'If a payment attempt fails, the shopper sees a clear error message and can:\n\n1. Retry with the same method\n2. Pick a different payment method',
          evidence: 'components/checkout/PaymentStep.tsx:40-96',
        },
      ],
      summaryNote:
        '2 existing stories, discovered 1 new story, and marked 1 at risk.',
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
        <header className="flex items-start justify-between gap-4 rounded-3xl border border-border/70 bg-card/80 px-6 py-5 shadow-lg">
          <div className="flex-1">
            <h1 className="font-display text-2xl text-foreground sm:text-3xl">
              {data.pullRequest.title}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <a
                href={`https://github.com/${data.pullRequest.author.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-foreground transition-colors"
              >
                <img
                  src={data.pullRequest.author.avatarUrl}
                  alt={data.pullRequest.author.username}
                  className="size-4 rounded-full"
                />
                <span>{data.pullRequest.author.username}</span>
              </a>
              <span>·</span>
              <a
                href={`https://github.com/${orgName}/${repoName}/tree/${data.pullRequest.branch}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-foreground transition-colors"
              >
                <GitBranch className="size-4 text-muted-foreground" />
                <span className="font-mono text-xs">
                  {data.pullRequest.branch}
                </span>
              </a>
            </p>
            {data.workflowResult.scopeItems.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Impacted domains:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {data.workflowResult.scopeItems.map((scope) => (
                    <span
                      key={scope}
                      className="inline-flex items-center rounded-full bg-muted px-2 py-[3px] text-[10px] font-medium text-muted-foreground"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <a
            href={`https://github.com/${orgName}/${repoName}/pull/${data.pullRequest.number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xl font-semibold text-muted-foreground hover:text-foreground transition-colors sm:text-2xl"
          >
            #{data.pullRequest.number}
          </a>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <ChangelogSummaryCard
            orgName={orgName}
            repoName={repoName}
            pullRequestNumber={data.pullRequest.number}
            summary={data.changelogSummary}
            workflowResult={data.workflowResult}
          />
          <FeatureFilmCard />
        </section>

        <StoriesCarousel
          orgName={orgName}
          repoName={repoName}
          storiesPanel={data.storiesPanel}
          branch={data.pullRequest.branch}
        />
      </main>
    </AppLayout>
  )
}

interface ChangelogSummaryCardProps {
  orgName: string
  repoName: string
  pullRequestNumber: number
  summary: ChangelogSummaryData
  workflowResult: DiscoverStoriesFromCommitsResult
}

function ChangelogSummaryCard({
  orgName,
  repoName,
  pullRequestNumber,
  summary,
  workflowResult,
}: ChangelogSummaryCardProps) {
  const buildChangelogText = () => {
    const scopeSection =
      workflowResult.scopeItems.length > 0
        ? [
            'Scopes:',
            ...workflowResult.scopeItems.map((scope) => `  - ${scope}`),
            '',
          ]
        : []

    const sectionLines = summary.sections.flatMap((section) => [
      `${section.title}:`,
      ...section.items.map((item) => `  - ${item}`),
      '',
    ])

    return ['Changelog', '', ...scopeSection, ...sectionLines].join('\n')
  }

  const handleCopyChangelog = async () => {
    const changelogText = buildChangelogText()

    try {
      await navigator.clipboard.writeText(changelogText)
      toast.success('Changelog copied to clipboard')
    } catch (_error) {
      toast.error('Failed to copy changelog')
    }
  }

  const handleShareOnX = () => {
    const changelogText = buildChangelogText()
    const shareUrl = `https://github.com/${orgName}/${repoName}`
    const shareText = `${changelogText}\n\n${shareUrl}`

    const xUrl = `https://x.com/intent/post?text=${encodeURIComponent(
      shareText,
    )}&url=${encodeURIComponent(shareUrl)}`

    window.open(xUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex-1 space-y-3">
          <p
            className="text-xs font-semibold tracking-[0.3em] text-primary"
            title="Henka - Change."
          >
            変更
          </p>
          <h2 className="text-lg font-semibold">Changelog</h2>
          <p className="text-xs text-muted-foreground">
            Summary of changes for pull request #{pullRequestNumber}
          </p>
        </div>
      </div>
      <Card className="group relative overflow-hidden border-border/70 bg-card/80 shadow-lg">
        <div className="absolute right-4 top-4 z-10 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyChangelog}
            aria-label="Copy changelog"
            className="h-8 w-8 p-0"
          >
            <Copy className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShareOnX}
            aria-label="Share on X"
            className="h-8 w-8 p-0"
          >
            <XLogo className="size-4" />
          </Button>
        </div>
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
        </CardContent>
      </Card>
    </div>
  )
}

function FeatureFilmCard() {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p
          className="text-xs font-semibold tracking-[0.3em] text-primary"
          title="Film."
        >
          映画
        </p>
        <h2 className="text-lg font-semibold">Feature Film</h2>
        <p className="text-xs text-muted-foreground">
          Watch the film to understand the changes fully.
        </p>
      </div>
      <Card className="relative overflow-hidden border-border/70 bg-card/80 shadow-lg aspect-video">
        <CardContent className="flex items-center justify-center p-0 h-full">
          <div className="w-full h-full bg-muted/30 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">🎥 Feature Film</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface StoriesCarouselProps {
  orgName: string
  repoName: string
  storiesPanel: StoriesPanelData
  branch: string
}

function StoriesCarousel({
  orgName,
  repoName,
  storiesPanel,
  branch,
}: StoriesCarouselProps) {
  const [processedStories, setProcessedStories] = useState<Set<string>>(
    new Set(),
  )

  // Filter out processed stories to get visible stories
  const visibleStories = storiesPanel.stories.filter(
    (story) => !processedStories.has(story.id),
  )

  const currentStory = visibleStories[0]
  const allStoriesProcessed = visibleStories.length === 0

  const handleAccept = () => {
    if (currentStory) {
      setProcessedStories((prev) => {
        const next = new Set(prev)
        next.add(currentStory.id)
        return next
      })
    }
  }

  const handleIgnore = () => {
    if (currentStory) {
      setProcessedStories((prev) => {
        const next = new Set(prev)
        next.add(currentStory.id)
        return next
      })
    }
  }

  // Get stories that should be visible in the stack (current + next 2)
  const stackedStories = visibleStories.slice(0, 3)

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p
          className="text-xs font-semibold tracking-[0.3em] text-primary"
          title="Sutōrī - Stories."
        >
          ストーリー
        </p>
        <h2 className="text-lg font-semibold">Impacted Stories</h2>
        <p className="text-xs text-muted-foreground">
          {storiesPanel.summaryNote}
        </p>
      </div>

      {allStoriesProcessed ? (
        <div className="flex items-center justify-center py-12">
          <ZenBrushStroke />
        </div>
      ) : (
        <div className="relative" style={{ minHeight: '400px' }}>
          {stackedStories.map((story, stackIndex) => {
            const isActive = stackIndex === 0
            const zIndex = stackedStories.length - stackIndex
            const scale = 1 - stackIndex * 0.04
            const opacity = 1 - stackIndex * 0.25

            const blurAmount = stackIndex > 0 ? `${stackIndex * 2}px` : '0px'
            const translateY = stackIndex * 24

            const style = {
              position: 'absolute' as const,
              top: 0,
              left: 0,
              right: 0,
              zIndex,
              transform: `scale(${scale}) translateY(${translateY}px)`,
              pointerEvents: isActive ? ('auto' as const) : ('none' as const),
              opacity: isActive ? 1 : Math.max(0.3, opacity),
              filter: isActive ? 'none' : `blur(${blurAmount})`,
              userSelect: isActive ? ('auto' as const) : ('none' as const),
              transition: 'all 500ms ease-out',
            }

            return (
              <div key={story.id} className="relative w-full" style={style}>
                <StoryCard
                  story={story}
                  orgName={orgName}
                  repoName={repoName}
                  branch={branch}
                  action={null}
                  onAccept={handleAccept}
                  onIgnore={handleIgnore}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ZenBrushStroke() {
  return (
    <svg
      viewBox="0 0 400 200"
      className="w-full max-w-md text-muted-foreground/30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 50 100 Q 100 50, 150 80 T 250 90 T 350 100"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M 60 110 Q 110 60, 160 90 T 260 100 T 360 110"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M 45 95 Q 95 45, 145 75 T 245 85 T 345 95"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.3"
      />
    </svg>
  )
}

interface ShikiCodeBlockProps {
  code: string
  language: string
  fileName?: string
  githubUrl?: string
}

function ShikiCodeBlock({
  code,
  language,
  fileName,
  githubUrl,
}: ShikiCodeBlockProps) {
  const [html, setHtml] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const highlightCode = async () => {
      try {
        const highlighted = await codeToHtml(code, {
          lang: language,
          theme: 'github-light',
        })
        setHtml(highlighted)
      } catch (error) {
        console.error('Failed to highlight code:', error)
        setHtml(`<pre><code>${code}</code></pre>`)
      } finally {
        setIsLoading(false)
      }
    }

    void highlightCode()
  }, [code, language, fileName, githubUrl])

  if (isLoading) {
    return (
      <div className="shiki-container">
        {fileName && (
          <div className="shiki-header">
            <span className="shiki-file-name">{fileName}</span>
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shiki-header-link"
              >
                View on GitHub
              </a>
            )}
          </div>
        )}
        <pre className="shiki">
          <code>{code}</code>
        </pre>
      </div>
    )
  }

  return (
    <div
      className="shiki-container"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

interface StoryCardProps {
  story: ChangelogStory
  orgName: string
  repoName: string
  branch: string
  action: StoryAction
  onAccept: () => void
  onIgnore: () => void
}

function StoryCard({
  story,
  orgName,
  repoName,
  branch,
  action,
  onAccept,
  onIgnore,
}: StoryCardProps) {
  const [content, setContent] = useState(story.summary)

  if (action !== null) {
    const isIgnored = action === 'ignored'
    return (
      <Card className="relative overflow-hidden border-border bg-card shadow-lg cursor-pointer hover:bg-card/90 transition-colors">
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <h3
              className={`text-sm font-semibold text-foreground truncate flex-1 ${
                isIgnored ? 'line-through text-muted-foreground' : ''
              }`}
            >
              {story.title}
            </h3>
            {!isIgnored && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <a
                  href={`/org/${orgName}/repo/${repoName}/stories/${story.id}`}
                >
                  <ChevronRight className="size-5" />
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="relative overflow-hidden border-border bg-card shadow-lg">
      <CardContent>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-medium">
          <StoryStatusPill status={story.status} />
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-[3px] text-[10px] font-medium text-muted-foreground">
            {story.area}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-foreground">{story.title}</h3>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div>
            <TiptapEditor
              value={content}
              onChange={setContent}
              readOnly={false}
              className="min-h-[100px]"
            />
          </div>
          <div>
            {(() => {
              const [filePath, lineRange] = story.evidence.split(':')
              const lineAnchor = lineRange
                ? `#L${lineRange.replace('-', '-L')}`
                : ''
              const githubUrl = `https://github.com/${orgName}/${repoName}/blob/${branch}/${filePath}${lineAnchor}`
              return (
                <ShikiCodeBlock
                  code={`const email = localStorage.getItem('checkout-email')\nuseEffect(() => {\n  if (email) setEmail(email)\n}, [])`}
                  language="typescript"
                  fileName={filePath}
                  githubUrl={githubUrl}
                />
              )
            })()}
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={onAccept} size="sm" variant="default">
            Accept
          </Button>
          <Button onClick={onIgnore} size="sm" variant="outline">
            Ignore
          </Button>
        </div>
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
        ? 'Change'
        : status === 'at-risk'
          ? 'At risk'
          : 'Unchanged'

  const className =
    status === 'new'
      ? 'border-chart-1/40 bg-chart-1/15 text-chart-1'
      : status === 'updated'
        ? 'border-primary/40 bg-primary/15 text-primary'
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
