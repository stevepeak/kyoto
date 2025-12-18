'use client'

import { cn } from '@/lib/utils'

type ActiveTab = 'stories' | 'integrations'

type TabNavProps = {
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
}

export function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <div className="flex border-b">
      <button
        onClick={() => onTabChange('stories')}
        className={cn(
          'flex-1 px-4 py-3 text-sm font-medium transition-colors',
          activeTab === 'stories'
            ? 'border-b-2 border-primary text-primary'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Stories
      </button>
      <button
        onClick={() => onTabChange('integrations')}
        className={cn(
          'flex-1 px-4 py-3 text-sm font-medium transition-colors',
          activeTab === 'integrations'
            ? 'border-b-2 border-primary text-primary'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Integrations
      </button>
    </div>
  )
}
