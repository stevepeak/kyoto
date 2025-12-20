'use client'

import { type Story } from '@app/schemas'
import { TEMP_STORY_ID } from '@app/utils'
import { ArrowUpRight, Globe, Plus, Terminal } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'

type NewStoryMenuProps = {
  isCreating: boolean
  onCreateStory: (testType: 'browser' | 'vm') => void
  stories: Story[]
  planId: 'free' | 'pro' | 'max'
}

export function NewStoryMenu({
  isCreating,
  onCreateStory,
  stories,
  planId,
}: NewStoryMenuProps) {
  const isFreePlan = planId === 'free'
  // Exclude temp stories from count since they're not persisted
  const savedStoriesCount = stories.filter(
    (story) => story.id !== TEMP_STORY_ID,
  ).length
  const hasReachedLimit = isFreePlan && savedStoriesCount >= 3

  if (hasReachedLimit) {
    return (
      <div className="border-b p-4">
        <Button asChild className="w-full" variant="outline">
          <Link href="/billing">
            Upgrade Plan
            <ArrowUpRight className="ml-1 size-4" />
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="border-b p-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button disabled={isCreating} className="w-full" variant="outline">
            {isCreating ? <Spinner /> : <Plus className="size-4" />}
            New Story
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuItem
            onClick={() => onCreateStory('browser')}
            className="flex cursor-pointer items-start gap-3 p-3"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
              <Globe className="size-4" />
            </div>
            <div className="space-y-0.5">
              <div className="font-medium">Browser Test</div>
              <div className="text-xs text-muted-foreground">
                Test web apps with AI browser agent
              </div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onCreateStory('vm')}
            className="flex cursor-pointer items-start gap-3 p-3"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Terminal className="size-4" />
            </div>
            <div className="space-y-0.5">
              <div className="font-medium">Virtual Machine</div>
              <div className="text-xs text-muted-foreground">
                Test CLI, API, SDK, or MCP servers from a virtual machine.
              </div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
