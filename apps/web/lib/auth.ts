import { getConfig } from '@app/config'
import { schema } from '@app/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

import { db } from '@/lib/db'

const config = getConfig()

export const auth = betterAuth({
  baseURL: config.APP_URL,
  secret: config.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  user: {
    additionalFields: {
      login: {
        type: 'string',
        required: true,
      },
    },
  },
  socialProviders: {
    github: {
      clientId: config.GITHUB_CLIENT_ID,
      clientSecret: config.GITHUB_CLIENT_SECRET,
      mapProfileToUser: (profile) => ({
        name: profile.name || profile.login,
        email: profile.email,
        image: profile.avatar_url,
        login: profile.login,
      }),
    },
  },
  // Disable email/password since we're GitHub only
  emailAndPassword: {
    enabled: false,
  },
})
