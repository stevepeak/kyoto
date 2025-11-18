declare module 'better-auth/adapters/drizzle' {
  import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
  import type { BetterAuthOptions, DBAdapter } from '@better-auth/core'

  type DrizzleProvider = 'pg' | 'sqlite' | 'mysql'

  interface DrizzleAdapterConfig {
    provider: DrizzleProvider
    schema: Record<string, any>
    debugLogs?: boolean
  }

  export function drizzleAdapter(
    db: NodePgDatabase<any>,
    config: DrizzleAdapterConfig,
  ): (options: BetterAuthOptions) => DBAdapter<BetterAuthOptions>

  export type { DrizzleProvider }
}
