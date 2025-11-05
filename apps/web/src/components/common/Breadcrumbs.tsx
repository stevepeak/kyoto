import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface BreadcrumbItem {
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
      <nav className="text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <span key={`${item.label}-${index}`}>
              {item.href && !isLast ? (
                <a href={item.href} className="hover:text-foreground">
                  {item.label}
                </a>
              ) : (
                <span className="text-foreground">{item.label}</span>
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
