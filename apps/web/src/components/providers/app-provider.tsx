'use client'

import { Toaster } from '../ui/sonner'

import { AuthProvider } from './auth-provider'
import { BreadcrumbsProvider } from './breadcrumbs-provider'
import { TrpcProvider } from './trpc-provider'

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <TrpcProvider>
      <AuthProvider>
        <BreadcrumbsProvider>
          {children}
          <Toaster />
        </BreadcrumbsProvider>
      </AuthProvider>
    </TrpcProvider>
  )
}
