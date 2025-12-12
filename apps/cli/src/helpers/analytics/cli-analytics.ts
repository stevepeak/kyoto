import { getConfig } from '../config/get'

export type CliAnalyticsContext =
  | { enabled: true; distinctId: string }
  | { enabled: false; distinctId: null }

export async function getCliAnalyticsContext(): Promise<CliAnalyticsContext> {
  try {
    const config = await getConfig()

    if (config.analytics === false) {
      // ❌ Analytics disabled in config
      return { enabled: false, distinctId: null }
    }

    // ✅ Analytics enabled in config
    return { enabled: true, distinctId: config.user.login }
  } catch {
    // ❌ Error getting config
    return { enabled: false, distinctId: null }
  }
}
