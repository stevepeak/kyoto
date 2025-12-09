import type React from 'react'

export interface LogEntry {
  content: React.ReactNode
  key: string
}

export type Logger = (message: React.ReactNode | string) => void
