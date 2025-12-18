'use client'

import { type StoryRun } from '@app/schemas'
import { type ChangeEvent } from 'react'

import {
  RunDetailsPanel,
  RunSidebar,
  StoryEditor,
} from '@/components/stories/agents'

type RunsLayoutProps = {
  selectedRun: StoryRun | null
  runs: StoryRun[]
  isStoryLoading: boolean
  selectedRunId: string | null
  nextScheduledRun: Date | null
  editedInstructions: string
  editedScheduleText: string
  editedCronSchedule: string
  isParsing: boolean
  parseError: string | null
  onRunSelect: (runId: string | null) => void
  onInstructionsChange: (value: string) => void
  onScheduleTextChange: (e: ChangeEvent<HTMLInputElement>) => void
  onScheduleBlur: () => void
}

export function RunsLayout({
  selectedRun,
  runs,
  isStoryLoading,
  selectedRunId,
  nextScheduledRun,
  editedInstructions,
  editedScheduleText,
  editedCronSchedule,
  isParsing,
  parseError,
  onRunSelect,
  onInstructionsChange,
  onScheduleTextChange,
  onScheduleBlur,
}: RunsLayoutProps) {
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main content - Editor or Run Details */}
      <div className="flex-1 overflow-auto p-6">
        {selectedRun ? (
          <RunDetailsPanel run={selectedRun} onBack={() => onRunSelect(null)} />
        ) : (
          <StoryEditor
            instructions={editedInstructions}
            scheduleText={editedScheduleText}
            cronSchedule={editedCronSchedule}
            isParsing={isParsing}
            parseError={parseError}
            onInstructionsChange={onInstructionsChange}
            onScheduleTextChange={onScheduleTextChange}
            onScheduleBlur={onScheduleBlur}
          />
        )}
      </div>

      {/* Runs sidebar */}
      <RunSidebar
        runs={runs}
        isLoading={isStoryLoading}
        selectedRunId={selectedRunId}
        nextScheduledRun={nextScheduledRun}
        onRunSelect={onRunSelect}
      />
    </div>
  )
}
