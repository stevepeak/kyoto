import { neon, neonConfig } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePostgres } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import ws from 'ws'
import * as schema from './schema'

function setupNeonDb(connectionString: string) {
  neonConfig.webSocketConstructor = ws
  const sql = neon(connectionString)
  return drizzleNeon(sql, { schema })
}

function setupPostgresDb(connectionString: string) {
  const pool = new Pool({
    connectionString,
  })

  pool.on('error', (err: Error) => {
    console.error('Unexpected error on idle Postgres client', err)
  })

  return drizzlePostgres(pool, { schema })
}

export function setupDb(connectionString: string) {
  if (!connectionString) {
    throw new Error('connectionString cannot be empty')
  }

  const isNeonDb = connectionString.includes('.neon.tech/')
  return isNeonDb
    ? setupNeonDb(connectionString)
    : setupPostgresDb(connectionString)
}

export type Db = ReturnType<typeof setupDb>
