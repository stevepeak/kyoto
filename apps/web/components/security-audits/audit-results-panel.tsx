'use client'

import { ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type AgentResult = {
  agent: string
  status: 'pass' | 'fail' | 'warning'
  checks: {
    check: string
    status: 'pass' | 'fail' | 'warning'
    details?: string
    recommendation?: string
  }[]
  logs: string[]
}

type AuditResultsPanelProps = {
  testSuiteId: string
  agentResults: AgentResult[]
}

function AgentSection({ agent, status, checks, logs }: AgentResult) {
  const [isExpanded, setIsExpanded] = useState(false)

  const statusColor =
    status === 'pass'
      ? 'text-green-500'
      : status === 'fail'
        ? 'text-destructive'
        : 'text-yellow-500'

  return (
    <Card className="mb-4">
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center gap-2 text-base">
          {isExpanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
          <ShieldCheck className={cn('size-5', statusColor)} />
          <span>{agent}</span>
          <span className={cn('ml-auto text-sm font-normal', statusColor)}>
            {status.toUpperCase()}
          </span>
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Checks */}
          <div>
            <h4 className="mb-2 text-sm font-semibold">Checks</h4>
            <div className="space-y-2">
              {checks.map((check, index) => (
                <div
                  key={index}
                  className={cn(
                    'rounded-md border p-3 text-sm',
                    check.status === 'pass'
                      ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950'
                      : check.status === 'fail'
                        ? 'border-destructive/50 bg-destructive/5'
                        : 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{check.check}</span>
                    <span
                      className={cn(
                        'text-xs font-medium',
                        check.status === 'pass'
                          ? 'text-green-600 dark:text-green-400'
                          : check.status === 'fail'
                            ? 'text-destructive'
                            : 'text-yellow-600 dark:text-yellow-400',
                      )}
                    >
                      {check.status.toUpperCase()}
                    </span>
                  </div>
                  {check.details && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {check.details}
                    </p>
                  )}
                  {check.recommendation && (
                    <p className="mt-2 text-xs font-medium text-muted-foreground">
                      Recommendation: {check.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Logs */}
          {logs.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">Logs</h4>
              <div className="rounded-md border bg-muted/50 p-3 font-mono text-xs">
                {logs.map((log, index) => (
                  <div key={index} className="text-muted-foreground">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export function AuditResultsPanel({
  testSuiteId,
  agentResults,
}: AuditResultsPanelProps) {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Security Audit Results</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the results from each security agent
        </p>
      </div>

      {agentResults.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No audit results available
        </div>
      ) : (
        <div>
          {agentResults.map((result, index) => (
            <AgentSection key={index} {...result} />
          ))}
        </div>
      )}
    </div>
  )
}
