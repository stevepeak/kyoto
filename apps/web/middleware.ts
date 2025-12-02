import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js middleware handles authentication redirects
 */

// Public routes that don't require authentication
// /setup is included because it's the OAuth callback destination
const publicRoutes = ['/', '/auth', '/about', '/setup']

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    // eslint-disable-next-line unicorn/prefer-string-raw -- Next.js requires a plain string, not String.raw
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Allow API routes (they handle their own auth)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Allow PostHog ingest routes (they are proxied to PostHog servers)
  if (pathname.startsWith('/ingest/')) {
    return NextResponse.next()
  }

  // Allow .well-known routes (used for various standards like security.txt, devtools, etc.)
  if (pathname.startsWith('/.well-known/')) {
    return NextResponse.next()
  }

  // Check for session cookie (better-auth uses cookies with 'better-auth' prefix)
  // Common cookie names: better-auth.session_token, better-auth.*
  // This is a lightweight check - actual session validation happens at page/API level
  const cookies = request.cookies.getAll()
  const hasSessionCookie = cookies.some((cookie) => {
    const name = cookie.name
    // Check for better-auth session cookies
    return (
      name.startsWith('better-auth') ||
      name === 'better-auth.session_token' ||
      name.includes('session_token')
    )
  })

  // If no session cookie, redirect to auth page
  if (!hasSessionCookie) {
    const authUrl = new URL('/auth', request.url)
    // Preserve the original URL for redirect after login
    authUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(authUrl)
  }

  // Session cookie exists, allow request
  // Note: Full session validation happens in server components/API routes
  return NextResponse.next()
}
