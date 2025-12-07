import {
  createLinearCustomerRequest,
  createLinearIssue,
  findOrCreateLinearCustomer,
  getLinearTeams,
} from '@app/linear'
import { TRPCError } from '@trpc/server'
import { dedent } from 'ts-dedent'
import { z } from 'zod'

import { getUserGithubLogin } from '../helpers/users.js'
import { protectedProcedure, router } from '../trpc.js'

const submitFeedbackInputSchema = z.object({
  feedback: z.string().min(1, 'Feedback is required'),
  pageUrl: z.string().url('Invalid page URL'),
})

export const feedbackRouter = router({
  submit: protectedProcedure
    .input(submitFeedbackInputSchema)
    .mutation(async ({ ctx, input }) => {
      const linearApiKey = ctx.env.LINEAR_API_KEY

      if (!linearApiKey) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Linear API key is not configured',
        })
      }

      const user = ctx.user
      const baseUserName = user.name || user.email || 'Unknown User'
      const userEmail = user.email || 'No email'

      // Get GitHub login and append to name if available
      let userName = baseUserName
      const githubLogin = await getUserGithubLogin({
        db: ctx.db,
        userId: user.id,
      })
      userName = `${baseUserName} @${githubLogin}`

      // Get or use default team ID - fetch first team if not specified in env
      let teamId: string = ctx.env.LINEAR_TEAM_ID ?? ''
      if (!teamId) {
        const teamsResult = await getLinearTeams(linearApiKey)
        if (
          !teamsResult.success ||
          !teamsResult.teams ||
          teamsResult.teams.length === 0
        ) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message:
              teamsResult.error ??
              'Failed to fetch Linear teams. Please configure LINEAR_TEAM_ID environment variable.',
          })
        }
        // Use the first team
        teamId = teamsResult.teams[0].id
      }

      // Create issue title from feedback (first 100 characters)
      const issueTitle =
        input.feedback.length > 100
          ? `Feedback: ${input.feedback.substring(0, 97)}...`
          : `Feedback: ${input.feedback}`

      // Create the issue first
      const issueResult = await createLinearIssue(linearApiKey, {
        title: issueTitle,
        teamId,
      })

      if (!issueResult.success || !issueResult.issueId) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: issueResult.error || 'Failed to create Linear issue',
        })
      }

      // Find or create customer
      const customerResult = await findOrCreateLinearCustomer(linearApiKey, {
        name: userName,
        email: userEmail !== 'No email' ? userEmail : undefined,
      })

      if (customerResult.success === false) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message:
            customerResult.error ?? 'Failed to create/find Linear customer',
        })
      }

      const customerId = customerResult.customerId
      if (!customerId) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Customer ID was not returned',
        })
      }

      // Format customer request body with feedback, user details, and page URL
      const customerRequestBody = dedent`
        ${input.feedback}

        ---
        
        **User Details:**
        [${userName}](mailto:${user.id}) [@${githubLogin}](https://github.com/${githubLogin})

        **Page URL:**
        ${input.pageUrl}
      `

      // Create customer request linking customer to issue
      const customerRequestResult = await createLinearCustomerRequest(
        linearApiKey,
        {
          customerId,
          issueId: issueResult.issueId,
          body: customerRequestBody,
          priority: 1,
        },
      )

      if (customerRequestResult.success === false) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message:
            customerRequestResult.error ??
            'Failed to create Linear customer request',
        })
      }

      return {
        success: true,
        issueId: issueResult.issueId,
        issueUrl: issueResult.issueUrl,
        customerRequestId: customerRequestResult.customerRequestId,
      }
    }),
})
