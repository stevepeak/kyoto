import { logger, streams, task, wait } from '@trigger.dev/sdk'

export const helloWorldTask = task({
  id: 'hello-world',
  run: async (args: { name?: string }): Promise<{ message: string }> => {
    const name = args.name ?? 'World'

    void streams.append('progress', `Hello, ${name}!`)
    logger.log('Starting hello world task', { name })

    // Simulate some work with progress updates
    await wait.for({ seconds: 5 })
    void streams.append('progress', 'Processing...')

    await wait.for({ seconds: 5 })
    void streams.append('progress', 'Almost done...')

    await wait.for({ seconds: 5 })
    void streams.append('progress', 'Complete!')

    const message = `Hello, ${name}! This is a test task.`

    logger.log('Hello world task completed', { message })

    return { message }
  },
})
