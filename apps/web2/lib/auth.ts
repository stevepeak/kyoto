import { getConfig } from '@app/config'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'

const config = getConfig()

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  socialProviders: {
    github: {
      clientId: config.GITHUB_CLIENT_ID,
      clientSecret: config.GITHUB_CLIENT_SECRET,
    },
  },
  // Disable email/password since we're GitHub only
  emailAndPassword: {
    enabled: false,
  },
})
