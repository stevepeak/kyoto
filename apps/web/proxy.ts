import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Note: Next.js 16 shows a deprecation warning about the "middleware" file convention
 * suggesting to use "proxy" instead. However, the standard middleware.ts file continues
 * to work and there's no clear migration path documented yet. This middleware handles
 * authentication redirects and should continue to function correctly.
 *
 * See: https://nextjs.org/docs/messages/middleware-to-proxy
 */

// Public routes that don't require authentication
const publicRoutes = ['/', '/auth', '/about']

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Allow API routes (they handle their own auth)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Check for session cookie (better-auth typically uses cookies starting with 'better-auth')
  // This is a lightweight check - actual session validation happens at page/API level
  const cookies = request.cookies.getAll()
  const hasSessionCookie = cookies.some(
    (cookie) =>
      cookie.name.startsWith('better-auth') ||
      cookie.name === 'better-auth.session_token',
  )

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
