import type { ReactNode } from 'react'

import { SidebarInset, SidebarProvider } from '../ui/sidebar'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'

import { AppSidebar } from './app-sidebar'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface Props {
  children: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  right?: ReactNode
}

export function AppLayout({ children, breadcrumbs, right }: Props) {
  return (
    <div className="h-screen w-full flex flex-col bg-background">
      <div className="flex flex-1 overflow-hidden">
        <SidebarProvider>
          <AppSidebar />

          <SidebarInset className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b">
              <div className="flex items-center gap-3 px-4 py-2">
                <a href="/" aria-label="Home" className="shrink-0">
                  <img src="/favicon.svg" alt="Logo" className="h-5 w-5" />
                </a>
                {breadcrumbs ? (
                  <Breadcrumbs
                    items={breadcrumbs}
                    right={right}
                    className="px-0 py-0"
                  />
                ) : null}
              </div>
            </div>
            {children}
          </SidebarInset>
        </SidebarProvider>
      </div>
    </div>
  )
}
