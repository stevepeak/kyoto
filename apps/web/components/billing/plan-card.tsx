import { Check, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

import { type Plan } from './constants'

interface PlanCardProps {
  plan: Plan
  onSelect: () => void
  isPending?: boolean
}

export function PlanCard({ plan, onSelect, isPending = false }: PlanCardProps) {
  return (
    <Card
      className={cn(
        'relative flex flex-col',
        plan.highlighted && 'border-2 border-primary shadow-lg',
        plan.current && 'ring-2 ring-primary ring-offset-2',
      )}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            <Sparkles className="size-3" />
            Popular
          </span>
        </div>
      )}

      {plan.current && (
        <div className="absolute -top-3 right-4">
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Current plan
          </span>
        </div>
      )}

      <CardHeader className="pb-4">
        <CardTitle className="text-2xl">{plan.name}</CardTitle>
        <CardDescription className="text-base">
          {plan.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col space-y-6">
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{plan.price}</span>
            {plan.priceDescription && (
              <span className="text-muted-foreground">
                {plan.priceDescription}
              </span>
            )}
          </div>
        </div>

        <ul className="flex-1 space-y-3">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check
                className={cn(
                  'mt-0.5 size-5 shrink-0',
                  plan.highlighted ? 'text-primary' : 'text-muted-foreground',
                )}
              />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          className={cn(
            'w-full',
            plan.highlighted &&
              'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500',
            plan.current && 'opacity-50 cursor-not-allowed',
          )}
          variant={plan.highlighted ? 'default' : 'outline'}
          disabled={plan.current || isPending}
          onClick={onSelect}
        >
          {isPending ? 'Loading...' : plan.current ? 'Current plan' : plan.cta}
        </Button>
      </CardFooter>
    </Card>
  )
}
