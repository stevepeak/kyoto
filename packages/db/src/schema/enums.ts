import { pgEnum } from 'drizzle-orm/pg-core'

export const userStatusEnum = pgEnum('user_status', [
  'active',
  'disabled',
  'invited',
])

export const storyStateEnum = pgEnum('story_state', [
  'active',
  'archived',
  'generated',
  'paused',
  'planned',
  'processing',
])
