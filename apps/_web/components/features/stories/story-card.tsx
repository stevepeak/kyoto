'use client'

import { type StoryState } from '@app/db/types'
import { Pause, Sparkles } from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

import { getStoryStatePillStyles } from './utils'

interface StoryCardProps {
  id: string
  name: string
  href: string
  groups: string[]
  state: StoryState
  isSelected?: boolean
  isFocused?: boolean
  onToggleSelection?: () => void
}

export function StoryCard({
  id: _id,
  name,
  href,
  groups,
  state,
  isSelected = false,
  isFocused = false,
  onToggleSelection,
}: StoryCardProps) {
  // Check if story is being processed (title is missing or placeholder)
  const isProcessing = !name || name.trim() === '' || name.trim() === 'foobar'
  const displayName = isProcessing
    ? 'Newly crafted story is being processed...'
    : name

  const statePill = getStoryStatePillStyles(state)
  const isGenerated = state === 'generated'
  const isPaused = state === 'paused'

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleSelection?.()
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // If clicking on checkbox area, don't navigate
    if ((e.target as HTMLElement).closest('[role="checkbox"]')) {
      return
    }
    // Otherwise, allow navigation
  }

  return (
    <>
      {isGenerated && (
        <style>{`
          @keyframes shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
          .shimmer-effect {
            animation: shimmer 3s infinite;
          }
        `}</style>
      )}
      <div
        onClick={handleCardClick}
        className={cn(
          'group flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted',
          isSelected && 'bg-muted',
          isFocused && 'bg-muted',
        )}
      >
        {onToggleSelection && (
          <div
            onClick={handleCheckboxClick}
            className={cn(
              'flex-shrink-0 transition-opacity duration-150',
              // Show checkbox when: selected, hovered, or focused
              isSelected || isFocused
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100',
            )}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelection}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
        <a
          href={href}
          className="flex-1 flex flex-col gap-2 min-w-0"
          onClick={(e) => {
            // If clicking on checkbox, don't navigate
            if ((e.target as HTMLElement).closest('[role="checkbox"]')) {
              e.preventDefault()
            }
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'font-medium line-clamp-1 flex-1',
                isProcessing
                  ? 'text-muted-foreground italic'
                  : 'text-foreground',
              )}
            >
              {displayName}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[10px] font-medium shrink-0',
                statePill.className,
                isGenerated &&
                  'border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 backdrop-blur-sm relative overflow-hidden',
              )}
            >
              {isGenerated && (
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent shimmer-effect" />
              )}
              {isGenerated && <Sparkles className="h-3 w-3 relative z-10" />}
              {isPaused && <Pause className="h-3 w-3" />}
              <span className={cn(isGenerated && 'relative z-10')}>
                {statePill.label}
              </span>
            </span>
          </div>
          {groups.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {groups.map((group) => (
                <span
                  key={group}
                  className="inline-flex items-center rounded-full bg-primary/10 px-2 py-[3px] text-[10px] font-medium text-primary"
                >
                  {group}
                </span>
              ))}
            </div>
          )}
        </a>
      </div>
    </>
  )
}
