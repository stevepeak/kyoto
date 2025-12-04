'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { KeyboardShortcutHint } from '@/components/common/keyboard-shortcut-hint'
import { StoryCard } from './story-card'
import { useTRPCClient } from '@/client/trpc'
import { toast } from 'sonner'
import { Archive, Pause } from 'lucide-react'

import type { StoryState } from '@app/db/types'
import type { TestStatus } from '@app/schemas'
import { cn } from '@/lib/utils'

type StoryStatus = TestStatus | null

interface StoryItem {
  id: string
  name: string
  story: string
  state: StoryState
  createdAt: string | null
  updatedAt: string | null
  groups: string[]
  latestStatus: StoryStatus
  latestStatusAt: string | null
}

interface StoryListProps {
  stories: StoryItem[]
  orgName: string
  repoName: string
  onStoriesChange?: () => void
}

export function StoryList({
  stories,
  orgName,
  repoName,
  onStoriesChange,
}: StoryListProps) {
  const trpc = useTRPCClient()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  // Reset selection when stories change
  useEffect(() => {
    setSelectedIds(new Set())
    setFocusedIndex(null)
  }, [stories.length])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if we're in the stories list area or if no input is focused
      const activeElement = document.activeElement
      const isInputFocused =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.getAttribute('contenteditable') === 'true'

      if (isInputFocused) {
        return
      }

      // Check if we're in the stories list area
      if (!listRef.current?.contains(activeElement)) {
        // If not in list, only handle if clicking in the stories panel
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((prev) => {
          if (prev === null) {
            return 0
          }
          return Math.min(prev + 1, stories.length - 1)
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((prev) => {
          if (prev === null) {
            return stories.length - 1
          }
          return Math.max(prev - 1, 0)
        })
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault()
        if (
          focusedIndex !== null &&
          focusedIndex >= 0 &&
          focusedIndex < stories.length
        ) {
          const storyId = stories[focusedIndex].id
          setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(storyId)) {
              next.delete(storyId)
            } else {
              next.add(storyId)
            }
            return next
          })
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setSelectedIds(new Set())
        setFocusedIndex(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusedIndex, stories])

  // Focus the item when focusedIndex changes
  useEffect(() => {
    if (focusedIndex !== null && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.focus()
    }
  }, [focusedIndex])

  const handleToggleSelection = useCallback((storyId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(storyId)) {
        next.delete(storyId)
      } else {
        next.add(storyId)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === stories.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(stories.map((s) => s.id)))
    }
  }, [selectedIds.size, stories])

  const handleBulkPause = useCallback(async () => {
    if (selectedIds.size === 0) {
      return
    }

    setIsBulkActionLoading(true)
    try {
      await trpc.story.bulkPause.mutate({
        orgName,
        repoName,
        storyIds: Array.from(selectedIds),
      })
      toast.success(
        `Paused ${selectedIds.size} ${selectedIds.size === 1 ? 'story' : 'stories'}`,
      )
      setSelectedIds(new Set())
      onStoriesChange?.()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to pause stories',
      )
    } finally {
      setIsBulkActionLoading(false)
    }
  }, [selectedIds, orgName, repoName, trpc, onStoriesChange])

  const handleBulkArchive = useCallback(async () => {
    if (selectedIds.size === 0) {
      return
    }

    setIsBulkActionLoading(true)
    try {
      await trpc.story.bulkArchive.mutate({
        orgName,
        repoName,
        storyIds: Array.from(selectedIds),
      })
      toast.success(
        `Archived ${selectedIds.size} ${selectedIds.size === 1 ? 'story' : 'stories'}`,
      )
      setSelectedIds(new Set())
      onStoriesChange?.()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to archive stories',
      )
    } finally {
      setIsBulkActionLoading(false)
    }
  }, [selectedIds, orgName, repoName, trpc, onStoriesChange])

  if (stories.length === 0) {
    return (
      <>
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
        <EmptyState
          kanji="さくせい"
          kanjiTitle="Sakusei - to create."
          title="Craft your first story"
          description="Stories encapsulate the intent of a user behavior or technical workflow within your product. Articulate your story in natural language, then Kyoto will evaluate the intent to ensure the code aligns with your requirements."
          action={
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button asChild size="lg">
                <a href={`/org/${orgName}/repo/${repoName}/stories/new`}>
                  Craft new story
                  <KeyboardShortcutHint />
                </a>
              </Button>
            </div>
          }
        />
      </>
    )
  }

  const hasSelection = selectedIds.size > 0

  return (
    <div className="flex flex-col">
      {hasSelection && (
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-2 flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} {selectedIds.size === 1 ? 'story' : 'stories'}{' '}
            selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkPause}
              disabled={isBulkActionLoading}
            >
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkArchive}
              disabled={isBulkActionLoading}
            >
              <Archive className="h-4 w-4 mr-1" />
              Archive
            </Button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/50">
        <button
          type="button"
          onClick={handleSelectAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {selectedIds.size === stories.length ? 'Deselect all' : 'Select all'}
        </button>
      </div>
      <ul ref={listRef} className="divide-y divide-border">
        {stories.map((story, index) => (
          <li key={story.id}>
            <div
              ref={(el) => {
                itemRefs.current[index] = el
              }}
              tabIndex={0}
              className={cn(
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                focusedIndex === index && 'ring-2 ring-ring ring-offset-2',
              )}
              onFocus={() => setFocusedIndex(index)}
              onBlur={(e) => {
                // Only clear focus if we're not moving to another item in the list
                if (!listRef.current?.contains(e.relatedTarget as Node)) {
                  // Keep focus index for keyboard navigation
                }
              }}
            >
              <StoryCard
                id={story.id}
                name={story.name}
                href={`/org/${orgName}/repo/${repoName}/stories/${story.id}`}
                groups={story.groups}
                state={story.state}
                isSelected={selectedIds.has(story.id)}
                onToggleSelection={() => handleToggleSelection(story.id)}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
