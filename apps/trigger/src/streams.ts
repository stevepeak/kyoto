import { streams, type InferStreamType } from '@trigger.dev/sdk'

// Stream for progress updates
export const progressStream = streams.define<{ step: string; percent: number }>(
  {
    id: 'progress',
  },
)

// Export types
export type ProgressStreamPart = InferStreamType<typeof progressStream>
