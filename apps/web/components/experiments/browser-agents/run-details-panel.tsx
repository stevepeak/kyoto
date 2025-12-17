'use client'

import { type StoryRun } from '@app/schemas'
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  Loader2,
  Video,
  XCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSessionRecordingPlayer } from '@/hooks/use-session-recording-player'
import { cn } from '@/lib/utils'

import { getDisplayStatus, RunStatusIcon } from './run-status-utils'

type RunDetailsPanelProps = {
  run: StoryRun
  onBack: () => void
}

export function RunDetailsPanel({ run, onBack }: RunDetailsPanelProps) {
  const {
    containerRef,
    isPlayerReady,
    isLoading: isRecordingLoading,
    error: recordingError,
    hasRecording,
  } = useSessionRecordingPlayer({
    runId: run.id,
    sessionId: run.sessionId,
  })

  const observations = run.observations
  const displayStatus = getDisplayStatus(run)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back to Editor
        </Button>
        <div className="flex items-center gap-2">
          <RunStatusIcon status={displayStatus.status} />
          <span className="font-medium">{displayStatus.label}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {new Date(run.createdAt).toLocaleString()}
        </span>
      </div>

      {/* Summary */}
      {observations && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {observations.success ? (
                <CheckCircle className="size-5 text-green-500" />
              ) : (
                <XCircle className="size-5 text-destructive" />
              )}
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {observations.summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {run.error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <XCircle className="size-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{run.error}</p>
          </CardContent>
        </Card>
      )}

      {/* Session Recording */}
      {run.sessionId && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Video className="size-5" />
              Session Recording
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center rounded-lg bg-muted/50">
              {isRecordingLoading ? (
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <Loader2 className="size-8 animate-spin" />
                  <span>Loading recording...</span>
                </div>
              ) : recordingError ? (
                <div className="flex flex-col items-center gap-3 py-12 text-destructive">
                  <span>Failed to load recording</span>
                  <span className="text-sm text-muted-foreground">
                    {recordingError.message}
                  </span>
                </div>
              ) : !isPlayerReady && hasRecording ? (
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <Loader2 className="size-8 animate-spin" />
                  <span>Initializing player...</span>
                </div>
              ) : null}
              <div
                ref={containerRef}
                className={cn(isPlayerReady ? 'block' : 'hidden')}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Observations */}
      {observations && observations.observations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Agent Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {observations.observations.map((obs, index) => (
                <div key={index} className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="font-medium text-sm">{obs.action}</div>
                      <div className="text-sm text-muted-foreground">
                        {obs.result}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(obs.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No observations yet */}
      {!observations && !run.error && run.status === 'running' && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="size-8 animate-spin mb-4" />
          <p>Agent is running...</p>
        </div>
      )}

      {!observations && !run.error && run.status === 'pending' && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Circle className="size-8 mb-4" />
          <p>Waiting to start...</p>
        </div>
      )}
    </div>
  )
}
