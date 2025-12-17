'use client'

import { Copy } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

type SamplePayloadPreviewProps = {
  payload: unknown
}

export function SamplePayloadPreview(props: SamplePayloadPreviewProps) {
  const { payload } = props

  const handleCopyPayload = () => {
    void navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    toast.success('Sample payload copied to clipboard')
  }

  return (
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
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  )
}
