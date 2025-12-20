import { cn } from '@/lib/utils'

import { type BillingPeriod } from './constants'

interface BillingPeriodToggleProps {
  billingPeriod: BillingPeriod
  onBillingPeriodChange: (period: BillingPeriod) => void
}

export function BillingPeriodToggle({
  billingPeriod,
  onBillingPeriodChange,
}: BillingPeriodToggleProps) {
  return (
    <div className="flex items-center justify-center">
      <div className="inline-flex items-center gap-2 rounded-lg border bg-muted p-1">
        <button
          type="button"
          onClick={() => onBillingPeriodChange('monthly')}
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium transition-colors',
            billingPeriod === 'monthly'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => onBillingPeriodChange('annual')}
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium transition-colors',
            'relative',
            billingPeriod === 'annual'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Annual
          <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
            30% off
          </span>
        </button>
      </div>
    </div>
  )
}
