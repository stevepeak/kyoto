import { z } from 'zod'

import { protectedProcedure, router } from '../trpc'

const storiesMock = [
  {
    id: 's1',
    title: 'Login flow',
    featureTitle: 'Feature: User authentication',
    gherkinText: `Feature: User authentication\n  Scenario: Successful login\n    Given I am on the sign-in page\n    When I authenticate with GitHub\n    Then I should be redirected to the dashboard`,
    commitSha: 'abc1234',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const storyRouter = router({
  listByBranch: protectedProcedure
    .input(z.object({ orgSlug: z.string(), repoName: z.string(), branchName: z.string() }))
    .query(() => {
      return { stories: storiesMock.map((s) => ({
        id: s.id,
        title: s.title,
        featureTitle: s.featureTitle,
        commitSha: s.commitSha,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })) }
    }),

  get: protectedProcedure
    .input(z.object({ orgSlug: z.string(), repoName: z.string(), storyId: z.string() }))
    .query(({ input }) => {
      const story = storiesMock.find((s) => s.id === input.storyId)
      return {
        story: story ?? null,
        filesTouched: story
          ? [
              { path: 'apps/web/src/pages/index.astro', summary: 'Displays dashboard' },
              { path: 'packages/api/src/routers/story.ts', summary: 'Adds story routers' },
            ]
          : [],
      }
    }),
})


