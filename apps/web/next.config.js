const { withSentryConfig } = require('@sentry/nextjs')
const path = require('path')

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
  webpack: (config) => {
    // Suppress webpack warnings from Sentry/OpenTelemetry instrumentation
    config.ignoreWarnings = [
      { module: /@opentelemetry\/instrumentation/ },
      { module: /require-in-the-middle/ },
    ]

    // Allow importing kysely-adapter from better-auth
    // Use direct path to bypass package.json exports restriction
    const kyselyAdapterPath = path.resolve(
      __dirname,
      'node_modules/better-auth/dist/adapters/kysely-adapter/index.mjs',
    )
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
  // Only upload source maps in production builds
  dryRun: process.env.NODE_ENV !== 'production',
}

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions)
