import type { BuildExtension } from '@trigger.dev/sdk'

declare module '@trigger.dev/build/extensions' {
  export type EsbuildPluginOptions = {
    placement?: 'first' | 'last'
    target?: 'deploy' | 'local'
  }

  export function esbuildPlugin(
    plugin: unknown,
    options?: EsbuildPluginOptions,
  ): BuildExtension
}

declare module '@sentry/esbuild-plugin' {
  export interface SentryEsbuildPluginOptions {
    org: string
    project: string
    authToken?: string
    release?: string
    url?: string
  }

  export function sentryEsbuildPlugin(
    options: SentryEsbuildPluginOptions,
  ): unknown
}

