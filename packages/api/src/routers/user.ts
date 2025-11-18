import { z } from 'zod'

import { getUser, getUserGithubLogin, updateUser } from '../helpers/users'
import { protectedProcedure, router } from '../trpc'

// Validate timezone against IANA timezone database
const timezoneSchema = z.string().refine(
  (tz) => {
    try {
      // This will throw if the timezone is invalid
      Intl.DateTimeFormat(undefined, { timeZone: tz })
      return true
    } catch {
      return false
    }
  },
  { message: 'Invalid timezone identifier' },
)

const onboardingMetadataSchema = z.object({
  customerType: z.enum(['indie-hacker', 'vibe-coder', 'big-tech', 'startup']).optional(),
  currentTesting: z.string().optional(),
  goals: z.string().optional(),
  brokenFeature: z.string().optional(),
  writtenUserStories: z.boolean().optional(),
})

export const userRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id

    const user = await getUser({
      db: ctx.db,
      userId,
    })

    const githubLogin = await getUserGithubLogin({
      db: ctx.db,
      userId,
    })

    return {
      ...user,
      githubLogin,
    }
  }),

  update: protectedProcedure
    .input(
      z.object({
        timeZone: timezoneSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id

      const user = await updateUser({
        db: ctx.db,
        userId,
        values: {
          timeZone: input.timeZone,
        },
      })

      return user
    }),

  updateOnboarding: protectedProcedure
    .input(onboardingMetadataSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id

      // Get current user to merge existing onboarding metadata
      const currentUser = await getUser({
        db: ctx.db,
        userId,
      })

      const currentMetadata = ((currentUser as { onboardingMetadata?: unknown }).onboardingMetadata as Record<string, unknown>) || {}
      const updatedMetadata = {
        ...currentMetadata,
        ...input,
      }

      const user = await updateUser({
        db: ctx.db,
        userId,
        values: {
          onboardingMetadata: updatedMetadata,
        },
      })

      // Console log the answer for now
      console.log('Onboarding answer:', input)

      return user
    }),
})
