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
  // Sentry configuration will be added via @sentry/nextjs
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

module.exports = nextConfig
