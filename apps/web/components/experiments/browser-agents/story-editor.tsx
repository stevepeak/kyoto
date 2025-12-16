'use client'

import { Clock, Loader2 } from 'lucide-react'

import { Tiptap } from '@/components/tiptap'

type StoryEditorProps = {
  instructions: string
  scheduleText: string
  cronSchedule: string
  isParsing: boolean
  parseError: string | null
  onInstructionsChange: (value: string) => void
  onScheduleTextChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onScheduleBlur: () => void
}

export function StoryEditor({
  instructions,
  scheduleText,
  cronSchedule,
  isParsing,
  parseError,
  onInstructionsChange,
  onScheduleTextChange,
  onScheduleBlur,
}: StoryEditorProps) {
  return (
    <>
      {/* Schedule Input */}
      <div className="mb-4 rounded-lg border bg-muted/30 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Clock className="size-4" />
          Run Schedule
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={scheduleText}
            onChange={onScheduleTextChange}
            onBlur={onScheduleBlur}
            placeholder="e.g., every day at 5pm, every hour, every monday at 9am..."
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
          {isParsing && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {cronSchedule && (
          <div className="mt-2 text-xs text-muted-foreground">
            Cron:{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
              {cronSchedule}
            </code>
          </div>
        )}
        {parseError && (
          <div className="mt-2 text-xs text-destructive">{parseError}</div>
        )}
      </div>
      <Tiptap
        value={instructions}
        onChange={onInstructionsChange}
        className="min-h-[400px]"
        autoFocus
      />
    </>
  )
}
