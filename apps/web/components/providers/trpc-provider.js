'use client'
'use strict'
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i]
          for (const p in s) {
            if (Object.prototype.hasOwnProperty.call(s, p)) {
              t[p] = s[p]
            }
          }
        }
        return t
      }
    return __assign.apply(this, arguments)
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.TrpcProvider = TrpcProvider
const utils_1 = require('@app/utils')
const react_query_1 = require('@tanstack/react-query')
const client_1 = require('@trpc/client')
const react_1 = require('react')
const jsx_runtime_1 = require('react/jsx-runtime')
const superjson_1 = require('superjson')

const trpc_1 = require('@/client/trpc')
const use_smart_polling_1 = require('@/hooks/use-smart-polling')

const smart_polling_provider_1 = require('./smart-polling-provider')
function makeQueryClient() {
  return new react_query_1.QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000, // 30 seconds - reduced for more responsive updates
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
    },
  })
}
let browserQueryClient
function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient()
    }
    return browserQueryClient
  }
}
function getUrl() {
  // Client-side: use relative URL (works for same-origin requests)
  if (typeof window !== 'undefined') {
    return '/api/trpc'
  }
  // Server-side: need absolute URL
  // Check for explicit SITE_BASE_URL first (most reliable)
  if (process.env.SITE_BASE_URL) {
    return ''.concat(process.env.SITE_BASE_URL, '/api/trpc')
  }
  // Fallback to Vercel-provided URLs
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return 'https://'.concat(
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
      '/api/trpc',
    )
  }
  if (process.env.VERCEL_URL) {
    return 'https://'.concat(process.env.VERCEL_URL, '/api/trpc')
  }
  // Development fallback
  return 'http://localhost:3001/api/trpc'
}
/**
 * Inner tRPC provider that has access to smart polling context
 */
function TrpcProviderInner(_a) {
  const children = _a.children
  const queryClient = getQueryClient()
  const refetchInterval = (0, use_smart_polling_1.useSmartPolling)()
    .refetchInterval
  // Update default query options with smart polling interval
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, refetchInterval },
  })
  const trpcClient = (0, react_1.useState)(function () {
    return (0, client_1.createTRPCClient)({
      links: [
        (0, client_1.loggerLink)({
          enabled(options) {
            // Log all traffic in dev mode
            if (process.env.NODE_ENV === 'development') {
              return true
            }
            // Log errors
            if (
              options.direction === 'down' &&
              utils_1.is.error(options.result)
            ) {
              return true
            }
            return false
          },
        }),
        (0, client_1.httpBatchStreamLink)({
          url: getUrl(),
          transformer: superjson_1.default,
        }),
      ],
    })
  })[0]
  return (0, jsx_runtime_1.jsx)(react_query_1.QueryClientProvider, {
    client: queryClient,
    children: (0, jsx_runtime_1.jsx)(trpc_1.TRPCProvider, {
      trpcClient,
      queryClient,
      children,
    }),
  })
}
/**
 * Main tRPC provider that includes smart polling
 */
function TrpcProvider(_a) {
  const children = _a.children
  return (0, jsx_runtime_1.jsx)(smart_polling_provider_1.SmartPollingProvider, {
    children: (0, jsx_runtime_1.jsx)(TrpcProviderInner, { children }),
  })
}
