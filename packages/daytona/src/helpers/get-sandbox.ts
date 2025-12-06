import { Daytona } from '@daytonaio/sdk'
import { getConfig } from '@app/config'

type DaytonaClient = InstanceType<typeof Daytona>
type DaytonaSandbox = Awaited<ReturnType<DaytonaClient['get']>>

export async function getDaytonaSandbox(
  // TODO if missing need to create one
  sandboxId: string,
): Promise<DaytonaSandbox> {
  const { DAYTONA_API_KEY: apiKey } = getConfig()
  const daytona = new Daytona({ apiKey })
  return await daytona.get(sandboxId)
}

