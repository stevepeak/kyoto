import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { type NextRequest } from 'next/server'

import { appRouter, createContext } from '@/lib/trpc-server'

function handler(req: NextRequest) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError({ error, path }) {
      // eslint-disable-next-line no-console
      console.error(`tRPC Error on ${path}:`, error)
    },
  })
}

export { handler as GET, handler as POST }
