'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import {
  type Integration,
  SamplePayloadPreview,
  WebhookActions,
  WebhookForm,
  WebhookList,
} from '@/components/stories/agents'
import { useTRPC } from '@/lib/trpc-client'

export function IntegrationsPanel() {
  const trpc = useTRPC()
  const [isAddingWebhook, setIsAddingWebhook] = useState(false)
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<
    string | null
  >(null)

  const integrationsQuery = trpc.integrations.list.useQuery()
  const samplePayloadQuery = trpc.integrations.getSamplePayload.useQuery()

  const createMutation = trpc.integrations.create.useMutation({
    onSuccess: () => {
      void integrationsQuery.refetch()
      setIsAddingWebhook(false)
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

  const handleFormSubmit = (data: { name: string; url: string }) => {
    createMutation.mutate({
      type: 'webhook',
      name: data.name,
      config: { url: data.url },
    })
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

  const integrations = (integrationsQuery.data ?? []) as Integration[]
  const selectedIntegration = integrations.find(
    (i) => i.id === selectedIntegrationId,
  )

  return (
    <div className="flex h-full flex-col">
      {/* Add webhook button or form */}
      <div className="border-b p-4">
        <WebhookForm
          isOpen={isAddingWebhook}
          isPending={createMutation.isPending}
          onOpenChange={setIsAddingWebhook}
          onSubmit={handleFormSubmit}
        />
      </div>

      {/* Integrations list */}
      <div className="flex-1 overflow-auto p-2">
        <WebhookList
          integrations={integrations}
          isLoading={integrationsQuery.isLoading}
          selectedIntegrationId={selectedIntegrationId}
          onSelectIntegration={setSelectedIntegrationId}
        />
      </div>

      {/* Sample payload preview at bottom */}
      {samplePayloadQuery.data && (
        <SamplePayloadPreview payload={samplePayloadQuery.data} />
      )}

      {/* Selected integration actions */}
      {selectedIntegration && (
        <WebhookActions
          integration={selectedIntegration}
          isUpdatePending={updateMutation.isPending}
          isTestPending={testMutation.isPending}
          isDeletePending={deleteMutation.isPending}
          onToggleEnabled={() => handleToggleEnabled(selectedIntegration)}
          onTest={() => handleTest(selectedIntegration.id)}
          onDelete={() => handleDelete(selectedIntegration.id)}
        />
      )}
    </div>
  )
}
