'use client'

import { Loader2, Send, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

import { type Integration } from './integrations-webhook-list'

type WebhookActionsProps = {
  integration: Integration
  isUpdatePending: boolean
  isTestPending: boolean
  isDeletePending: boolean
  onToggleEnabled: () => void
  onTest: () => void
  onDelete: () => void
}

export function WebhookActions(props: WebhookActionsProps) {
  const {
    integration,
    isUpdatePending,
    isTestPending,
    isDeletePending,
    onToggleEnabled,
    onTest,
    onDelete,
  } = props

  return (
    <div className="border-t bg-background p-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onToggleEnabled}
          disabled={isUpdatePending}
        >
          {isUpdatePending ? (
            <Spinner />
          ) : integration.enabled ? (
            'Disable'
          ) : (
            'Enable'
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onTest}
          disabled={isTestPending || !integration.enabled}
          title={
            !integration.enabled
              ? 'Enable the webhook to send a test'
              : 'Send test webhook'
          }
        >
          {isTestPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={isDeletePending}
          className="text-destructive hover:text-destructive"
        >
          {isDeletePending ? <Spinner /> : <Trash2 className="size-4" />}
        </Button>
      </div>
    </div>
  )
}
