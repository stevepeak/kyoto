'use client'

import { type WebhookConfig } from '@app/schemas'
import {
  CheckCircle,
  Copy,
  Loader2,
  Plus,
  Send,
  Trash2,
  Webhook,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useTRPC } from '@/lib/trpc-client'
import { cn } from '@/lib/utils'

type Integration = {
  id: string
  type: 'webhook'
  name: string
  config: unknown
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export function IntegrationsPanel() {
  const trpc = useTRPC()
  const [isAddingWebhook, setIsAddingWebhook] = useState(false)
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<
    string | null
  >(null)
  const [formName, setFormName] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formErrors, setFormErrors] = useState<{
    name?: string
    url?: string
  }>({})

  const integrationsQuery = trpc.integrations.list.useQuery()
  const samplePayloadQuery = trpc.integrations.getSamplePayload.useQuery()

  const createMutation = trpc.integrations.create.useMutation({
    onSuccess: () => {
      void integrationsQuery.refetch()
      setIsAddingWebhook(false)
      setFormName('')
      setFormUrl('')
      setFormErrors({})
      toast.success('Webhook created successfully')
    },
    onError: (error) => {
      toast.error(`Failed to create webhook: ${error.message}`)
    },
  })

  const deleteMutation = trpc.integrations.delete.useMutation({
    onSuccess: () => {
      void integrationsQuery.refetch()
      setSelectedIntegrationId(null)
      toast.success('Webhook deleted')
    },
    onError: (error) => {
      toast.error(`Failed to delete webhook: ${error.message}`)
    },
  })

  const updateMutation = trpc.integrations.update.useMutation({
    onSuccess: () => {
      void integrationsQuery.refetch()
      toast.success('Webhook updated')
    },
    onError: (error) => {
      toast.error(`Failed to update webhook: ${error.message}`)
    },
  })

  const testMutation = trpc.integrations.test.useMutation({
    onSuccess: () => {
      toast.success('Test webhook sent successfully!')
    },
    onError: (error) => {
      toast.error(`Test failed: ${error.message}`)
    },
  })

  const validateForm = (): boolean => {
    const errors: { name?: string; url?: string } = {}

    if (!formName.trim()) {
      errors.name = 'Name is required'
    } else if (formName.length > 255) {
      errors.name = 'Name must be less than 255 characters'
    }

    if (!formUrl.trim()) {
      errors.url = 'URL is required'
    } else {
      try {
        new URL(formUrl)
      } catch {
        errors.url = 'Please enter a valid URL'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    createMutation.mutate({
      type: 'webhook',
      name: formName.trim(),
      config: { url: formUrl.trim() },
    })
  }

  const handleCancel = () => {
    setIsAddingWebhook(false)
    setFormName('')
    setFormUrl('')
    setFormErrors({})
  }

  const handleToggleEnabled = (integration: Integration) => {
    updateMutation.mutate({
      id: integration.id,
      enabled: !integration.enabled,
    })
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id })
  }

  const handleTest = (id: string) => {
    testMutation.mutate({ id })
  }

  const handleCopyPayload = () => {
    if (samplePayloadQuery.data) {
      void navigator.clipboard.writeText(
        JSON.stringify(samplePayloadQuery.data, null, 2),
      )
      toast.success('Sample payload copied to clipboard')
    }
  }

  const integrations = integrationsQuery.data ?? []
  const selectedIntegration = integrations.find(
    (i) => i.id === selectedIntegrationId,
  )

  return (
    <div className="flex h-full flex-col">
      {/* Add webhook button or form */}
      <div className="border-b p-4">
        {isAddingWebhook ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Webhook name..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
              {formErrors.name && (
                <p className="mt-1 text-xs text-destructive">
                  {formErrors.name}
                </p>
              )}
            </div>
            <div>
              <input
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
              {formErrors.url && (
                <p className="mt-1 text-xs text-destructive">
                  {formErrors.url}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending ? <Spinner /> : 'Add'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button
            onClick={() => setIsAddingWebhook(true)}
            className="w-full"
            variant="outline"
          >
            <Plus className="size-4" />
            Add Webhook
          </Button>
        )}
      </div>

      {/* Integrations list */}
      <div className="flex-1 overflow-auto p-2">
        {integrationsQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : integrations.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No integrations yet
          </div>
        ) : (
          <div className="space-y-1">
            {integrations.map((integration: Integration) => {
              const config = integration.config as WebhookConfig
              return (
                <button
                  key={integration.id}
                  onClick={() => setSelectedIntegrationId(integration.id)}
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
        )}
      </div>

      {/* Sample payload preview at bottom */}
      {samplePayloadQuery.data && (
        <div className="border-t p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Sample Webhook Payload</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={handleCopyPayload}
            >
              <Copy className="size-3" />
            </Button>
          </div>
          <pre className="max-h-32 overflow-auto rounded bg-muted p-2 font-mono text-[10px]">
            {JSON.stringify(samplePayloadQuery.data, null, 2)}
          </pre>
        </div>
      )}

      {/* Selected integration actions - shown as overlay */}
      {selectedIntegration && (
        <div className="border-t bg-background p-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleToggleEnabled(selectedIntegration)}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Spinner />
              ) : selectedIntegration.enabled ? (
                'Disable'
              ) : (
                'Enable'
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTest(selectedIntegration.id)}
              disabled={testMutation.isPending || !selectedIntegration.enabled}
              title={
                !selectedIntegration.enabled
                  ? 'Enable the webhook to send a test'
                  : 'Send test webhook'
              }
            >
              {testMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(selectedIntegration.id)}
              disabled={deleteMutation.isPending}
              className="text-destructive hover:text-destructive"
            >
              {deleteMutation.isPending ? (
                <Spinner />
              ) : (
                <Trash2 className="size-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
