const { withSentryConfig } = require('@sentry/nextjs')
const path = require('path')

const kyselyAdapterPath = path.resolve(
  __dirname,
  'node_modules/better-auth/dist/adapters/kysely-adapter/index.mjs',
)

const isProd = process.env.NODE_ENV === 'production'

// Note: the dev script runs `next dev` (Turbopack by default), while
// production builds use `next build --webpack`. Keep aliases and plugins
// in sync across both bundlers to avoid environment-specific bugs.

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@app/api', '@app/db', '@app/schemas', '@app/utils'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Link',
            value:
              '<https://api.github.com>; rel=preconnect; crossorigin=anonymous',
          },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ]
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  experimental: {
    // Enable Turbopack's filesystem cache in development for faster rebuilds
    turbopackFileSystemCacheForDev: true,
  },
  // Turbopack-specific configuration for development
  // Mirrors the webpack alias below so the better-auth Kysely adapter
  // continues to resolve correctly when using Turbopack.
  turbopack: {
    resolveAlias: {
      'better-auth/adapters/kysely-adapter': kyselyAdapterPath,
    },
  },
  webpack: (config) => {
    // Suppress webpack warnings from Sentry/OpenTelemetry instrumentation
    config.ignoreWarnings = [
      { module: /@opentelemetry\/instrumentation/ },
      { module: /require-in-the-middle/ },
    ]

    // Allow importing kysely-adapter from better-auth
    // Use direct path to bypass package.json exports restriction
    config.resolve.alias = {
      ...config.resolve.alias,
      'better-auth/adapters/kysely-adapter': kyselyAdapterPath,
    }

    return config
  },
}

// Sentry configuration for source maps and error tracking
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Set release to commit SHA from Vercel deployments
  // This ensures source maps are associated with the correct release
  ...(process.env.VERCEL_GIT_COMMIT_SHA
    ? { release: { name: process.env.VERCEL_GIT_COMMIT_SHA } }
    : {}),
  // Only upload source maps in production builds
  dryRun: process.env.NODE_ENV !== 'production',
}
// We only enable the Sentry webpack plugin for production builds so that
// local development (Turbopack or Webpack) stays as fast as possible.
// Runtime Sentry remains configured via `instrumentation.ts`.
const exportedConfig = isProd
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig

module.exports = exportedConfig
