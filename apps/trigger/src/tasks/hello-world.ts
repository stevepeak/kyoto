import { parseEnv } from '@app/agents'
import { task, logger } from '@trigger.dev/sdk'

export const helloWorldTask = task({
  id: 'hello-world',
  run: async (_payload: Record<string, never>, { ctx: _ctx }) => {
    const env = parseEnv()
    logger.info('Hello World!', { pjt: env.TRIGGER_PROJECT_ID })
    await Promise.resolve()
    return { message: 'Hello World!' }
  },
})
