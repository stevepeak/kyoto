'use client'

import { useEffect, type ReactNode } from 'react'
import type { BreadcrumbItem } from '@/components/common/Breadcrumbs'

import { useBreadcrumbs } from '@/components/providers/breadcrumbs-provider'

interface Props {
  children: ReactNode
  breadcrumbs?: BreadcrumbItem[]
}

export function AppLayout({ children, breadcrumbs }: Props) {
  const { setBreadcrumbs } = useBreadcrumbs()

  useEffect(() => {
    setBreadcrumbs(breadcrumbs)
    return () => {
      setBreadcrumbs(undefined)
    }
  }, [breadcrumbs, setBreadcrumbs])

  return (
    <div className="min-h-screen w-full flex flex-col bg-background">
      <div className="flex-1">{children}</div>
    </div>
  )
}
