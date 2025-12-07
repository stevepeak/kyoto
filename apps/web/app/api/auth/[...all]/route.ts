import { toNextJsHandler } from 'better-auth/next-js'

import { getAuth } from '@/lib/auth'

// Create handler with lazy auth initialization
// This ensures auth is only initialized when the route is actually called
const authHandler = toNextJsHandler(getAuth())

export const GET = authHandler.GET
export const POST = authHandler.POST
