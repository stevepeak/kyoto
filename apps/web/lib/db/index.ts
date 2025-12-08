import { createDb } from '@app/db2'

export const db = createDb()
export type DB = typeof db
