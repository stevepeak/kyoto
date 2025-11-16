declare module 'better-auth/adapters/kysely-adapter' {
  import { Kysely } from 'kysely';
  import { BetterAuthOptions, DBAdapter, DBAdapterDebugLogOption } from '@better-auth/core';

  type KyselyDatabaseType = 'postgres' | 'mysql' | 'sqlite' | 'mssql';

  interface KyselyAdapterConfig {
    type?: KyselyDatabaseType;
    debugLogs?: DBAdapterDebugLogOption;
    usePlural?: boolean;
    transaction?: boolean;
  }

  export function kyselyAdapter(
    db: Kysely<any>,
    config?: KyselyAdapterConfig
  ): (options: BetterAuthOptions) => DBAdapter<BetterAuthOptions>;

  export type { KyselyDatabaseType };
}

