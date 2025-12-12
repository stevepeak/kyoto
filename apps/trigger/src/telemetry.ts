import { trace, type Tracer } from '@opentelemetry/api'
import { NodeSDK } from '@opentelemetry/sdk-node'
import * as Sentry from '@sentry/node'
import { SentrySpanProcessor } from '@sentry/opentelemetry'

let sdk: NodeSDK | undefined
let tracer: Tracer | undefined
let initializing: Promise<Tracer | undefined> | undefined
let sentryInitialized = false

async function startSdk(): Promise<Tracer | undefined> {
  if (tracer) {
    return tracer
  }

  if (initializing) {
    return await initializing
  }

  initializing = (async () => {
    if (!sentryInitialized) {
      Sentry.init({
        defaultIntegrations: false,
        // eslint-disable-next-line no-process-env
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 1.0,
        sendDefaultPii: false,
        integrations: [
          // Add the Vercel AI SDK integration
          Sentry.vercelAIIntegration({
            recordInputs: true,
            recordOutputs: true,
          }),
        ],
        // eslint-disable-next-line no-process-env
        ...(process.env.TRIGGER_RELEASE
          ? // eslint-disable-next-line no-process-env
            { release: process.env.TRIGGER_RELEASE }
          : {}),
        environment:
          // eslint-disable-next-line no-process-env
          process.env.NODE_ENV === 'production' ? 'production' : 'development',
      })
      sentryInitialized = true
    }

    sdk = new NodeSDK({
      spanProcessor: new SentrySpanProcessor(),
    })

    try {
      await Promise.resolve(sdk.start())
    } catch (error) {
      initializing = undefined
      // eslint-disable-next-line no-console
      console.warn('Failed to start OpenTelemetry SDK for Sentry', error)
      return undefined
    }

    tracer = trace.getTracer('kyoto-agents')
    return tracer
  })()

  const result = await initializing
  initializing = undefined
  return result
}

export async function setupTelemetry(): Promise<Tracer | undefined> {
  return await startSdk()
}
