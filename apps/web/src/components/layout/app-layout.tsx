import type { ReactNode } from 'react'

import { TopNav } from './top-nav'

interface BreadcrumbItem {
  label: string
  href?: string
  showGithubIcon?: boolean
}

interface Props {
  children: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  right?: ReactNode
}

export function AppLayout({ children, breadcrumbs, right }: Props) {
  return (
    <div className="h-screen w-full flex flex-col bg-background">
      <TopNav breadcrumbs={breadcrumbs} right={right} />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
