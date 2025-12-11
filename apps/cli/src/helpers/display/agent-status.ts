import { type AgentRunState } from '@app/types'

export const statusColor: Record<AgentRunState['status'], string> = {
  pending: 'grey',
  running: 'red',
  success: 'green',
  warn: 'yellow',
  fail: 'red',
}
