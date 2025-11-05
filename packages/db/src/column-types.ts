import type { ColumnType, RawBuilder } from 'kysely'

export type JSONValue =
  | null
  | string
  | number
  | boolean
  | {
      [value: string]: JSONValue
    }
  | Array<JSONValue>

// Run story execution status type
export type RunStory = {
  storyId: string
  status: 'pass' | 'fail' | 'running' | 'skipped'
}

// Column type for runs.stories JSONB array
export type RunStoryColumnType = ColumnType<
  RunStory[],
  RunStory[] | RawBuilder<RunStory[]>,
  RunStory[] | RawBuilder<RunStory[]>
>

// Example of how to define a custom column type
//
// export type ProjectStage = {
//   name: string
//   description: string
// }

// // Includes RawBuilder to allow for JSONB
// export type ProjectStageColumnType = ColumnType<
//   ProjectStage[] | null,
//   ProjectStage[] | null | RawBuilder<ProjectStage[]>,
//   ProjectStage[] | null | RawBuilder<ProjectStage[]>
// >

// export type EmailAddress = {
//   email: string
//   name?: string
// }

// // Email address array type for JSONB columns
// export type EmailAddressColumnType = ColumnType<
//   EmailAddress[],
//   EmailAddress[] | RawBuilder<EmailAddress[]>,
//   EmailAddress[] | RawBuilder<EmailAddress[]>
// >
