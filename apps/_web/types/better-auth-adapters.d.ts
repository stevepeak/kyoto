declare module 'better-auth/adapters/kysely-adapter' {
  import {
    type BetterAuthOptions,
    type DBAdapter,
    type DBAdapterDebugLogOption,
  } from '@better-auth/core'
  import { type Kysely } from 'kysely'

  type KyselyDatabaseType = 'postgres' | 'mysql' | 'sqlite' | 'mssql'

  interface KyselyAdapterConfig {
    type?: KyselyDatabaseType
    debugLogs?: DBAdapterDebugLogOption
    usePlural?: boolean
    transaction?: boolean
  }

  export function kyselyAdapter(
    db: Kysely<any>,
    config?: KyselyAdapterConfig,
  ): (options: BetterAuthOptions) => DBAdapter<BetterAuthOptions>

  export type { KyselyDatabaseType }
}
