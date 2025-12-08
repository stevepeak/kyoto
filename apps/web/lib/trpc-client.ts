'use client'

import { type AppRouter } from '@app/api'
import { createTRPCReact } from '@trpc/react-query'

export const trpc = createTRPCReact<AppRouter>()

export function useTRPC() {
  return trpc
}
