import type { ReactNode } from 'react'
import type { BreadcrumbItem } from '@/components/common/Breadcrumbs'

import { BetaBanner } from '@/components/common/beta-banner'
import { TopNav } from './top-nav'
import { AppFooter } from './app-footer'

interface Props {
  children: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  right?: ReactNode
}

export function AppLayout({ children, breadcrumbs, right }: Props) {
  return (
    <div className="min-h-screen w-full flex flex-col bg-background">
      <BetaBanner />
      <TopNav breadcrumbs={breadcrumbs} right={right} />
      <div className="flex-1">{children}</div>
      <AppFooter />
    </div>
  )
}
