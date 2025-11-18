import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import type {
  users,
  accounts,
  sessions,
  credentials,
  verifications,
  owners,
  ownerMemberships,
  repos,
  repoMemberships,
  stories,
  storyTestResults,
  storyEvidenceCache,
  runs,
} from './schema'

export * from './column-types'
export * from './schema'

// Export Drizzle types
export type User = InferSelectModel<typeof users>
export type Account = InferSelectModel<typeof accounts>
export type Session = InferSelectModel<typeof sessions>
export type Credential = InferSelectModel<typeof credentials>
export type Verification = InferSelectModel<typeof verifications>
export type Owner = InferSelectModel<typeof owners>
export type OwnerMembership = InferSelectModel<typeof ownerMemberships>
export type Repo = InferSelectModel<typeof repos>
export type RepoMembership = InferSelectModel<typeof repoMemberships>
export type Story = InferSelectModel<typeof stories>
export type StoryTestResult = InferSelectModel<typeof storyTestResults>
export type StoryEvidenceCache = InferSelectModel<typeof storyEvidenceCache>
export type Run = InferSelectModel<typeof runs>

// Insert types
export type InsertUser = InferInsertModel<typeof users>
export type InsertAccount = InferInsertModel<typeof accounts>
export type InsertSession = InferInsertModel<typeof sessions>
export type InsertCredential = InferInsertModel<typeof credentials>
export type InsertVerification = InferInsertModel<typeof verifications>
export type InsertOwner = InferInsertModel<typeof owners>
export type InsertOwnerMembership = InferInsertModel<typeof ownerMemberships>
export type InsertRepo = InferInsertModel<typeof repos>
export type InsertRepoMembership = InferInsertModel<typeof repoMemberships>
export type InsertStory = InferInsertModel<typeof stories>
export type InsertStoryTestResult = InferInsertModel<typeof storyTestResults>
export type InsertStoryEvidenceCache = InferInsertModel<
  typeof storyEvidenceCache
>
export type InsertRun = InferInsertModel<typeof runs>

// Enum types
export type StoryState =
  | 'active'
  | 'archived'
  | 'generated'
  | 'paused'
  | 'planned'
  | 'processing'

// Legacy DB type for backward compatibility (maps to Drizzle Db type)
export type { Db as DB } from './db'
