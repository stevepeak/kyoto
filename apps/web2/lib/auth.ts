import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  socialProviders: {
    github: {
      // eslint-disable-next-line no-process-env
      clientId: process.env.GITHUB_CLIENT_ID!,
      // eslint-disable-next-line no-process-env
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  // Disable email/password since we're GitHub only
  emailAndPassword: {
    enabled: false,
  },
})
