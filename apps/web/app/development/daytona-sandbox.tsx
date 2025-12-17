'use client'

import { Copy, Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useTRPC } from '@/lib/trpc-client'
import { toast } from 'sonner'

export function DaytonaSandbox() {
  const trpc = useTRPC()
  const [sandboxId, setSandboxId] = useState<string | null>(null)
  const [sshCommand, setSshCommand] = useState<string | null>(null)

  const createMutation = trpc.development.createSandbox.useMutation({
    onSuccess: async (data) => {
      setSandboxId(data.id)
      // Automatically get SSH access after creating
      await getSshMutation.mutateAsync({ sandboxId: data.id })
    },
    onError: (error) => {
      toast.error(`Failed to create sandbox: ${error.message}`)
    },
  })

  const getSshMutation = trpc.development.getSandboxSsh.useMutation({
    onSuccess: (data) => {
      setSshCommand(data.sshCommand)
      toast.success('SSH access token generated')
    },
    onError: (error) => {
      toast.error(`Failed to get SSH access: ${error.message}`)
    },
  })

  const destroyMutation = trpc.development.destroySandbox.useMutation({
    onSuccess: () => {
      setSandboxId(null)
      setSshCommand(null)
      toast.success('Sandbox destroyed')
    },
    onError: (error) => {
      toast.error(`Failed to destroy sandbox: ${error.message}`)
    },
  })

  const handleStartBox = () => {
    createMutation.mutate()
  }

  const handleDestroy = () => {
    if (sandboxId) {
      destroyMutation.mutate({ sandboxId })
    }
  }

  const handleCopySsh = async () => {
    if (sshCommand) {
      try {
        await navigator.clipboard.writeText(sshCommand)
        toast.success('SSH command copied to clipboard')
      } catch {
        toast.error('Failed to copy SSH command')
      }
    }
  }

  const isLoading =
    createMutation.isPending ||
    getSshMutation.isPending ||
    destroyMutation.isPending

  return (
    <div className="flex flex-col gap-4">
      {!sandboxId ? (
        <Button onClick={handleStartBox} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" />
              Starting...
            </>
          ) : (
            'Start Box'
          )}
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm">
            {sshCommand ?? 'Generating SSH access...'}
          </code>
          {sshCommand && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopySsh}
              aria-label="Copy SSH command"
            >
              <Copy className="size-4" />
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={handleDestroy}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                Destroying...
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                Destroy
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
