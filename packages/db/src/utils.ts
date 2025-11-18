import { sql } from 'drizzle-orm'

export function json<T>(value: T) {
  return sql<T>`CAST(${JSON.stringify(value)} AS JSONB)`
}
