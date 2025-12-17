import { createDb } from '@app/db'

export const db = createDb()
export type DB = typeof db
