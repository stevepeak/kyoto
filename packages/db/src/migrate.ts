import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

/**
 * Runs pending database migrations
 *
 * This script applies all pending migrations from the migrations folder
 */
async function runMigrations() {
  // eslint-disable-next-line no-console, no-process-env
  console.log('🔄 Running migrations...', process.env.DATABASE_URL)

  // Create connection for migrations
  // eslint-disable-next-line no-process-env
  const migrationClient = postgres(process.env.DATABASE_URL ?? '', { max: 1 })

  try {
    await migrate(drizzle(migrationClient), {
      migrationsFolder: './migrations',
    })

    // eslint-disable-next-line no-console
    console.log('✅ Migrations completed successfully')
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await migrationClient.end()
  }
}

void runMigrations()
