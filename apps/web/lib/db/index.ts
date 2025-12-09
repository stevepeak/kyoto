import { createDb } from '@app/db'

export const db = createDb()
type DB = typeof db
