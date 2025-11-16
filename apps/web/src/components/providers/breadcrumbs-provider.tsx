'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { BreadcrumbItem } from '@/components/common/Breadcrumbs'

interface BreadcrumbsContextValue {
  breadcrumbs: BreadcrumbItem[] | undefined
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[] | undefined) => void
}

const BreadcrumbsContext = createContext<BreadcrumbsContextValue | undefined>(
  undefined,
)

// Global state for breadcrumbs (shared across React trees)
let globalBreadcrumbs: BreadcrumbItem[] | undefined = undefined
const breadcrumbsListeners = new Set<(breadcrumbs: BreadcrumbItem[] | undefined) => void>()

function setGlobalBreadcrumbs(breadcrumbs: BreadcrumbItem[] | undefined) {
  globalBreadcrumbs = breadcrumbs
  breadcrumbsListeners.forEach((listener) => listener(breadcrumbs))
}

function subscribeToBreadcrumbs(listener: (breadcrumbs: BreadcrumbItem[] | undefined) => void) {
  breadcrumbsListeners.add(listener)
  listener(globalBreadcrumbs) // Call immediately with current value
  return () => {
    breadcrumbsListeners.delete(listener)
  }
}

export function BreadcrumbsProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbsState] = useState<BreadcrumbItem[] | undefined>(
    globalBreadcrumbs,
  )

  useEffect(() => {
    const unsubscribe = subscribeToBreadcrumbs((newBreadcrumbs) => {
      setBreadcrumbsState(newBreadcrumbs)
    })
    return unsubscribe
  }, [])

  const setBreadcrumbs = (newBreadcrumbs: BreadcrumbItem[] | undefined) => {
    setGlobalBreadcrumbs(newBreadcrumbs)
    setBreadcrumbsState(newBreadcrumbs)
  }

  return (
    <BreadcrumbsContext.Provider value={{ breadcrumbs, setBreadcrumbs }}>
      {children}
    </BreadcrumbsContext.Provider>
  )
}

export function useBreadcrumbs() {
  const context = useContext(BreadcrumbsContext)
  return context
}

// Hook for components outside the provider tree (like TopNav in layout)
export function useGlobalBreadcrumbs() {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[] | undefined>(
    globalBreadcrumbs,
  )

  useEffect(() => {
    const unsubscribe = subscribeToBreadcrumbs((newBreadcrumbs) => {
      setBreadcrumbs(newBreadcrumbs)
    })
    return unsubscribe
  }, [])

  return breadcrumbs
}
