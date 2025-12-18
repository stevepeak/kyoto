'use client'

import { Globe, Plus, Terminal } from 'lucide-react'

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
}

export function NewStoryMenu({ isCreating, onCreateStory }: NewStoryMenuProps) {
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
