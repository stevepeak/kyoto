import { getConfig } from '@app/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

const config = getConfig()

// Disable prefetch as it's not supported for "Transaction" pool mode
export const client = postgres(config.DATABASE_URL, { prepare: false })
export const db = drizzle(client, { schema })

export type DB = typeof db
