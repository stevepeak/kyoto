'use client'

import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

type Site = {
  id: string
  name: string
  url: string
}

type SitesSidebarProps = {
  sites: Site[]
  selectedSiteId: string | null
  onSiteSelect: (id: string) => void
  onCreateSite: () => void
  isLoading: boolean
}

export function SitesSidebar({
  sites,
  selectedSiteId,
  onSiteSelect,
  onCreateSite,
  isLoading,
}: SitesSidebarProps) {
  return (
    <div className="w-72 flex-shrink-0 border-r bg-muted/30">
      <div className="flex h-full flex-col">
        {/* New Site Button */}
        <div className="border-b p-4">
          <Button onClick={onCreateSite} className="w-full" variant="outline">
            <Plus className="size-4" />
            New Site
          </Button>
        </div>

        {/* Sites List */}
        <div className="flex-1 overflow-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : sites.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No sites yet
            </div>
          ) : (
            <div className="space-y-1">
              {sites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => onSiteSelect(site.id)}
                  className={cn(
                    'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    selectedSiteId === site.id &&
                      'bg-accent text-accent-foreground',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{site.name}</span>
                  </div>
                  <div className="ml-0 truncate text-xs text-muted-foreground">
                    {site.url}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
