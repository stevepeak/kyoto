'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Breadcrumbs() {
  const pathname = usePathname()

  // Don't show breadcrumbs on home page
  if (pathname === '/') {
    return null
  }

  // Parse the pathname to extract breadcrumb segments
  const segments = pathname.split('/').filter(Boolean)

  // Don't show breadcrumbs for simple paths
  if (segments.length === 0) {
    return null
  }

  const breadcrumbs: { label: string; href: string }[] = []

  // Handle /owner/repo pattern
  if (segments.length >= 1) {
    // Owner level: /owner
    breadcrumbs.push({
      label: segments[0],
      href: `/${segments[0]}`,
    })

    if (segments.length >= 2) {
      // Repo level: /owner/repo
      breadcrumbs.push({
        label: segments[1],
        href: `/${segments[0]}/${segments[1]}`,
      })
    }
  }

  // Don't render if no meaningful breadcrumbs
  if (breadcrumbs.length === 0) {
    return null
  }

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center gap-1">
          {index > 0 && '/'}
          {index === breadcrumbs.length - 1 ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="transition-colors hover:text-foreground"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
