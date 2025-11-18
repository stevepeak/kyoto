import { TRPCError } from '@trpc/server'

export function trpcNotFoundError(): TRPCError {
  return new TRPCError({
    code: 'NOT_FOUND',
    message: 'The requested resource was not found.',
  })
}
