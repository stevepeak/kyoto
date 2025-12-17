'use client'

import { Plus } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

type WebhookFormErrors = {
  name?: string
  url?: string
}

type WebhookFormProps = {
  isOpen: boolean
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; url: string }) => void
}

function validateWebhookForm(args: {
  name: string
  url: string
}): WebhookFormErrors {
  const { name, url } = args
  const errors: WebhookFormErrors = {}

  if (!name.trim()) {
    errors.name = 'Name is required'
  } else if (name.length > 255) {
    errors.name = 'Name must be less than 255 characters'
  }

  if (!url.trim()) {
    errors.url = 'URL is required'
  } else {
    try {
      new URL(url)
    } catch {
      errors.url = 'Please enter a valid URL'
    }
  }

  return errors
}

export function WebhookForm(props: WebhookFormProps) {
  const { isOpen, isPending, onOpenChange, onSubmit } = props

  const [formName, setFormName] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formErrors, setFormErrors] = useState<WebhookFormErrors>({})

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    const errors = validateWebhookForm({ name: formName, url: formUrl })
    setFormErrors(errors)

    if (Object.keys(errors).length > 0) return

    onSubmit({ name: formName.trim(), url: formUrl.trim() })
  }

  const handleCancel = () => {
    onOpenChange(false)
    setFormName('')
    setFormUrl('')
    setFormErrors({})
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => onOpenChange(true)}
        className="w-full"
        variant="outline"
      >
        <Plus className="size-4" />
        Add Webhook
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <input
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="Webhook name..."
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
        {formErrors.name && (
          <p className="mt-1 text-xs text-destructive">{formErrors.name}</p>
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
          <p className="mt-1 text-xs text-destructive">{formErrors.url}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending} className="flex-1">
          {isPending ? <Spinner /> : 'Add'}
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
  )
}
