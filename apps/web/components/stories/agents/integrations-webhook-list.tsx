'use client'

import { type WebhookConfig } from '@app/schemas'
import { CheckCircle, Webhook, XCircle } from 'lucide-react'

import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

export type Integration = {
  id: string
  type: 'webhook'
  name: string
  config: unknown
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

type WebhookListProps = {
  integrations: Integration[]
  isLoading: boolean
  selectedIntegrationId: string | null
  onSelectIntegration: (id: string) => void
}

export function WebhookList(props: WebhookListProps) {
  const {
    integrations,
    isLoading,
    selectedIntegrationId,
    onSelectIntegration,
  } = props

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    )
  }

  if (integrations.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No integrations yet
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {integrations.map((integration) => {
        const config = integration.config as WebhookConfig
        return (
          <button
            key={integration.id}
            onClick={() => onSelectIntegration(integration.id)}
            className={cn(
              'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              selectedIntegrationId === integration.id &&
                'bg-accent text-accent-foreground',
            )}
          >
            <div className="flex items-center gap-2">
              <Webhook className="size-4 text-muted-foreground" />
              <span className="flex-1 truncate font-medium">
                {integration.name}
              </span>
              {integration.enabled ? (
                <CheckCircle className="size-3 text-green-500" />
              ) : (
                <XCircle className="size-3 text-muted-foreground" />
              )}
            </div>
            <div className="mt-1 truncate text-xs text-muted-foreground">
              {config.url}
            </div>
          </button>
        )
      })}
    </div>
  )
}
