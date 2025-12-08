import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MinusCircle,
  XCircle,
} from 'lucide-react'

import { cn } from '@/lib/utils'

type StoryStatus = 'pass' | 'fail' | 'running' | 'skipped' | 'error'

interface StoryStatusCheckProps {
  status: StoryStatus
  className?: string
}

export function StoryStatusCheck({ status, className }: StoryStatusCheckProps) {
  switch (status) {
    case 'pass':
      return (
        <CheckCircle2 className={cn('size-10 text-green-600', className)} />
      )
    case 'fail':
      return <XCircle className={cn('size-10 text-red-600', className)} />
    case 'running':
      return (
        <Loader2
          className={cn('size-10 text-yellow-600 animate-spin', className)}
        />
      )
    case 'skipped':
      return (
        <MinusCircle
          className={cn('size-10 text-muted-foreground', className)}
        />
      )
    case 'error':
      return (
        <AlertTriangle className={cn('size-10 text-orange-600', className)} />
      )
    default:
      return null
  }
}
