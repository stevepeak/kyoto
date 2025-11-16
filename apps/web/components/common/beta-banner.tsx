'use client'

/**
 * Beta banner component for early release
 * use by
 * import { BetaBanner } from '@/components/common/beta-banner'
 * <BetaBanner />
 */
import { useEffect, useState } from 'react'
import { GiBigWave } from 'react-icons/gi'
import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

interface BetaBannerProps extends HTMLAttributes<HTMLDivElement> {}

export function BetaBanner({ className, ...props }: BetaBannerProps) {
  // Only render after hydration to prevent mismatches
  // The react-icons library may render differently on server vs client
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        className={cn(
          'w-full border-b border-blue-200 bg-blue-50 text-sm',
          className,
        )}
        {...props}
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-center gap-2 px-4 py-2.5 text-center">
          <span className="font-semibold text-blue-600">Early Release Beta</span>
          <span className="text-muted-foreground">
            - We&apos;re actively improving Kyoto with your help.
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'w-full border-b border-blue-200 bg-blue-50 text-sm',
        className,
      )}
      {...props}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-center gap-2 px-4 py-2.5 text-center">
        <GiBigWave className="h-4 w-4 text-blue-600" aria-hidden="true" />
        <span className="font-semibold text-blue-600">Early Release Beta</span>
        <span className="text-muted-foreground">
          - We&apos;re actively improving Kyoto with your help.
        </span>
      </div>
    </div>
  )
}
