import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
  right?: ReactNode
}

export function Breadcrumbs({ items, className, right }: BreadcrumbsProps) {
  return (
    <div
      className={cn('flex items-center justify-between px-4 py-3', className)}
    >
      <nav className="text-sm text-muted-foreground flex items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const hasHref = !!item.href
          const isOrg = index === 0
          const isRepo = index === 1
          return (
            <span
              key={`${item.label}-${index}`}
              className="flex items-center gap-1"
            >
              {hasHref ? (
                <a
                  href={item.href}
                  className={cn(
                    'px-2 py-1 -mx-2 -my-1 rounded-md hover:bg-muted/80 transition-colors hover:text-foreground',
                    'text-muted-foreground',
                    (isOrg || isRepo) && 'text-foreground',
                    isRepo && 'font-semibold',
                  )}
                >
                  {item.label}
                </a>
              ) : (
                <span
                  className={cn('text-foreground', isRepo && 'font-semibold')}
                >
                  {item.label}
                </span>
              )}
              {!isLast && <span className="mx-2">/</span>}
            </span>
          )
        })}
      </nav>
      {right ? <div className="ml-4">{right}</div> : null}
    </div>
  )
}
