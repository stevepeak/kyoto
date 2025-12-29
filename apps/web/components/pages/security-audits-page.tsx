'use client'

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { toast } from 'sonner'

import { Kanji } from '@/components/display/kanji'
import { AuditResultsPanel } from '@/components/security-audits/audit-results-panel'
import { SitesSidebar } from '@/components/security-audits/sites-sidebar'
import { TestSuitesSidebar } from '@/components/security-audits/test-suites-sidebar'
import { useTRPC } from '@/hooks/use-trpc'

export function SecurityAuditsPage() {
  const trpc = useTRPC()
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const [selectedTestSuiteId, setSelectedTestSuiteId] = useState<string | null>(
    null,
  )
  const [isCreatingSite, setIsCreatingSite] = useState(false)
  const [newSiteUrl, setNewSiteUrl] = useState('')
  const [editedScheduleText, setEditedScheduleText] = useState<string>('')
  const [editedCronSchedule, setEditedCronSchedule] = useState<string>('')

  const auditsQuery = trpc.securityAudit.audits.list.useQuery()
  const selectedAuditQuery = trpc.securityAudit.audits.get.useQuery(
    { id: selectedSiteId! },
    { enabled: Boolean(selectedSiteId) },
  )

  // Get orgs and repos for creating a new site
  const orgsQuery = trpc.org.listInstalled.useQuery()
  const firstOrg = orgsQuery.data?.orgs?.[0]
  const reposQuery = trpc.repo.listByOrg.useQuery(
    { orgName: firstOrg?.slug ?? '' },
    { enabled: Boolean(firstOrg?.slug) },
  )
  const firstEnabledRepo = reposQuery.data?.repos?.find((repo) => repo.enabled)

  const createAuditMutation = trpc.securityAudit.audits.create.useMutation({
    onSuccess: (newAudit) => {
      void auditsQuery.refetch()
      setSelectedSiteId(newAudit.id)
      setIsCreatingSite(false)
      setNewSiteUrl('')
      toast.success('Site created successfully')
    },
    onError: (error) => {
      toast.error(`Failed to create site: ${error.message}`)
    },
  })

  const triggerRunMutation = trpc.securityAudit.runs.trigger.useMutation({
    onSuccess: () => {
      void selectedAuditQuery.refetch()
      toast.success('Security audit run triggered')
    },
    onError: (error) => {
      toast.error(`Failed to trigger run: ${error.message}`)
    },
  })

  const parseCronMutation = trpc.browserAgents.parseCron.useMutation({
    onSuccess: (data) => {
      setEditedCronSchedule(data.cronSchedule)
      // Update audit with the parsed cron schedule
      if (selectedSiteId && editedScheduleText.trim()) {
        updateAuditMutation.mutate({
          id: selectedSiteId,
          scheduleText: editedScheduleText,
          cronSchedule: data.cronSchedule,
        })
      }
    },
    onError: (error) => {
      toast.error(`Failed to parse schedule: ${error.message}`)
    },
  })

  const updateAuditMutation = trpc.securityAudit.audits.update.useMutation({
    onSuccess: () => {
      void selectedAuditQuery.refetch()
      toast.success('Schedule updated')
    },
    onError: (error) => {
      toast.error(`Failed to update schedule: ${error.message}`)
    },
  })

  const sites = useMemo(() => {
    return (
      auditsQuery.data?.map((audit) => ({
        id: audit.id,
        name: audit.name,
        url: audit.targetUrl || '',
      })) ?? []
    )
  }, [auditsQuery.data])

  const testSuites = useMemo(() => {
    if (!selectedAuditQuery.data?.runs) return []
    return selectedAuditQuery.data.runs.map((run) => ({
      id: run.id,
      name: `Run ${new Date(run.createdAt).toLocaleDateString()}`,
      status: run.status as 'completed' | 'running' | 'failed' | 'pending',
      createdAt: new Date(run.createdAt),
      score: run.score ?? undefined,
    }))
  }, [selectedAuditQuery.data?.runs])

  const agentResults = useMemo(() => {
    const selectedRun = selectedAuditQuery.data?.runs?.find(
      (r) => r.id === selectedTestSuiteId,
    )
    if (!selectedRun?.results) return []

    // Format agent names for display (e.g., "browser-console" -> "Browser Console")
    const formatAgentName = (name: string): string => {
      return name
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }

    // Map category to agent name for backward compatibility
    const categoryToAgentName = (category: string): string => {
      const mapping: Record<string, string> = {
        https: 'browser-transport',
        headers: 'browser-headers',
        cookies: 'browser-cookies',
        storage: 'browser-storage',
        console: 'browser-console',
      }
      return mapping[category.toLowerCase()] ?? `code-${category.toLowerCase()}`
    }

    // Check if results is new format (has agents) or old format (flat array)
    const results = selectedRun.results as
      | {
          agents?: {
            agent: string
            status: 'pass' | 'fail' | 'warning'
            checks: {
              check: string
              status: 'pass' | 'fail' | 'warning' | 'na'
              details?: string
              recommendation?: string
            }[]
            logs?: string[]
          }[]
        }
      | {
          category: string
          check: string
          status: 'pass' | 'fail' | 'warning' | 'na'
          details?: string
          recommendation?: string
        }[]

    // Handle new format (with agents)
    if (results && typeof results === 'object' && 'agents' in results) {
      return (results.agents ?? []).map((agent) => ({
        ...agent,
        agent: formatAgentName(agent.agent),
        logs: agent.logs ?? [],
        checks: agent.checks.map((check) => ({
          ...check,
          status:
            check.status === 'na'
              ? 'warning'
              : (check.status as 'pass' | 'fail' | 'warning'),
        })),
      }))
    }

    // Handle old format (flat array) - group by category
    if (Array.isArray(results)) {
      // Group checks by category
      const checksByCategory = new Map<
        string,
        {
          check: string
          status: 'pass' | 'fail' | 'warning'
          details?: string
          recommendation?: string
        }[]
      >()

      for (const check of results) {
        const category = check.category ?? 'unknown'
        if (!checksByCategory.has(category)) {
          checksByCategory.set(category, [])
        }
        const checks = checksByCategory.get(category)!
        checks.push({
          check: check.check,
          status:
            check.status === 'na'
              ? 'warning'
              : (check.status as 'pass' | 'fail' | 'warning'),
          details: check.details,
          recommendation: check.recommendation,
        })
      }

      // Convert to agent format
      const agents: {
        agent: string
        status: 'pass' | 'fail' | 'warning'
        checks: {
          check: string
          status: 'pass' | 'fail' | 'warning'
          details?: string
          recommendation?: string
        }[]
        logs: string[]
      }[] = []

      for (const [category, checks] of checksByCategory.entries()) {
        // Determine overall status from checks
        const hasFail = checks.some((c) => c.status === 'fail')
        const hasWarning = checks.some((c) => c.status === 'warning')
        const status: 'pass' | 'fail' | 'warning' = hasFail
          ? 'fail'
          : hasWarning
            ? 'warning'
            : 'pass'

        agents.push({
          agent: categoryToAgentName(category),
          status,
          checks,
          logs: [],
        })
      }

      return agents.map((agent) => ({
        ...agent,
        agent: formatAgentName(agent.agent),
      }))
    }

    return []
  }, [selectedAuditQuery.data?.runs, selectedTestSuiteId])

  // Sync editor state when audit selection changes
  useEffect(() => {
    if (selectedAuditQuery.data?.audit) {
      setEditedScheduleText(selectedAuditQuery.data.audit.scheduleText ?? '')
      setEditedCronSchedule(selectedAuditQuery.data.audit.cronSchedule ?? '')
    }
  }, [selectedAuditQuery.data?.audit])

  // Auto-select first site and first test suite when data loads
  useEffect(() => {
    if (sites.length > 0 && !selectedSiteId) {
      setSelectedSiteId(sites[0]?.id ?? null)
    }
  }, [sites, selectedSiteId])

  useEffect(() => {
    if (testSuites.length > 0 && !selectedTestSuiteId) {
      setSelectedTestSuiteId(testSuites[0]?.id ?? null)
    }
  }, [testSuites, selectedTestSuiteId])

  const handleTriggerRun = useCallback(() => {
    if (!selectedSiteId) return
    triggerRunMutation.mutate({ auditId: selectedSiteId })
  }, [selectedSiteId, triggerRunMutation])

  const handleScheduleTextChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setEditedScheduleText(e.target.value)
      setEditedCronSchedule('')
    },
    [],
  )

  const handleScheduleBlur = useCallback(() => {
    if (!selectedSiteId) return

    // If schedule text is cleared, remove the schedule
    if (!editedScheduleText.trim()) {
      if (selectedAuditQuery.data?.audit?.scheduleText) {
        updateAuditMutation.mutate({
          id: selectedSiteId,
          scheduleText: null,
          cronSchedule: null,
        })
      }
      return
    }

    // Only parse if the text has changed
    if (
      editedScheduleText.trim() !== selectedAuditQuery.data?.audit?.scheduleText
    ) {
      parseCronMutation.mutate({ text: editedScheduleText })
    }
  }, [
    editedScheduleText,
    selectedAuditQuery.data?.audit?.scheduleText,
    selectedSiteId,
    parseCronMutation,
    updateAuditMutation,
  ])

  const handleCreateSite = () => {
    setIsCreatingSite(true)
    setSelectedSiteId(null)
  }

  const handleSubmitCreate = () => {
    const trimmedUrl = newSiteUrl.trim()

    if (!trimmedUrl) {
      toast.error('Please enter a URL')
      return
    }

    if (!firstEnabledRepo) {
      toast.error(
        'No enabled repository found. Please enable a repository first.',
      )
      return
    }

    // Validate and parse URL
    let urlObj: URL
    try {
      // Ensure URL has a protocol
      const urlWithProtocol =
        trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')
          ? trimmedUrl
          : `https://${trimmedUrl}`
      urlObj = new URL(urlWithProtocol)
    } catch {
      // Invalid URL format
      toast.error('Please enter a valid URL (e.g., https://example.com)')
      return
    }

    // Extract domain name from URL for the site name
    const siteName = urlObj.hostname.replace(/^www\./, '')

    const finalUrl = urlObj.toString()

    createAuditMutation.mutate({
      name: siteName,
      repoId: firstEnabledRepo.id,
      targetUrl: finalUrl,
    })
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Left Panel - Sites */}
      <SitesSidebar
        sites={sites}
        selectedSiteId={selectedSiteId}
        onSiteSelect={(id) => {
          setSelectedSiteId(id)
          setIsCreatingSite(false)
          setNewSiteUrl('')
        }}
        onCreateSite={handleCreateSite}
        isLoading={auditsQuery.isLoading}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {isCreatingSite ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-md space-y-4 p-8">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Create New Site</h2>
                <p className="text-sm text-muted-foreground">
                  Enter the URL of the site you want to audit
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="site-url"
                    className="text-sm font-medium leading-none"
                  >
                    URL
                  </label>
                  <input
                    id="site-url"
                    type="url"
                    value={newSiteUrl}
                    onChange={(e) => setNewSiteUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === 'Enter' &&
                        newSiteUrl.trim() &&
                        firstEnabledRepo
                      ) {
                        e.preventDefault()
                        handleSubmitCreate()
                      }
                    }}
                    placeholder="https://example.com"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    autoFocus
                  />
                  {!firstEnabledRepo && orgsQuery.isSuccess && (
                    <p className="text-xs text-destructive">
                      No enabled repositories found. Please enable a repository
                      first.
                    </p>
                  )}
                </div>
                <button
                  onClick={handleSubmitCreate}
                  disabled={
                    !newSiteUrl.trim() ||
                    !firstEnabledRepo ||
                    createAuditMutation.isPending
                  }
                  className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createAuditMutation.isPending
                    ? 'Creating...'
                    : 'Create Site'}
                </button>
              </div>
            </div>
          </div>
        ) : selectedSiteId ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Main Panel - Audit Results */}
            <AuditResultsPanel
              testSuiteId={selectedTestSuiteId || ''}
              agentResults={agentResults}
            />

            {/* Right Panel - Test Suites */}
            <TestSuitesSidebar
              testSuites={testSuites}
              selectedTestSuiteId={selectedTestSuiteId}
              onTestSuiteSelect={setSelectedTestSuiteId}
              isLoading={selectedAuditQuery.isLoading}
              auditId={selectedSiteId}
              onTriggerRun={handleTriggerRun}
              isTriggering={triggerRunMutation.isPending}
              scheduleText={editedScheduleText}
              cronSchedule={editedCronSchedule}
              isParsing={parseCronMutation.isPending}
              parseError={parseCronMutation.error?.message ?? null}
              onScheduleTextChange={handleScheduleTextChange}
              onScheduleBlur={handleScheduleBlur}
            />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="max-w-md text-center">
              <Kanji
                title="`安` Security `全` Complete `査` Audit"
                className="mb-2"
              >
                安全査
              </Kanji>
              <h2 className="text-xl font-semibold">Security Audits</h2>
              <p className="mt-2 text-muted-foreground">
                Select a site from the sidebar to view security audit results,
                or create a new site to get started.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
