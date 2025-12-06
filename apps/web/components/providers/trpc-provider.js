'use client';
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrpcProvider = TrpcProvider;
var jsx_runtime_1 = require("react/jsx-runtime");
var utils_1 = require("@app/utils");
var react_query_1 = require("@tanstack/react-query");
var client_1 = require("@trpc/client");
var react_1 = require("react");
var superjson_1 = require("superjson");
var trpc_1 = require("@/client/trpc");
var use_smart_polling_1 = require("@/hooks/use-smart-polling");
var smart_polling_provider_1 = require("./smart-polling-provider");
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
    });
}
var browserQueryClient = undefined;
function getQueryClient() {
    if (typeof window === 'undefined') {
        // Server: always make a new query client
        return makeQueryClient();
    }
    else {
        // Browser: make a new query client if we don't already have one
        if (!browserQueryClient) {
            browserQueryClient = makeQueryClient();
        }
        return browserQueryClient;
    }
}
function getUrl() {
    // Client-side: use relative URL (works for same-origin requests)
    if (typeof window !== 'undefined') {
        return '/api/trpc';
    }
    // Server-side: need absolute URL
    // Check for explicit SITE_BASE_URL first (most reliable)
    if (process.env.SITE_BASE_URL) {
        return "".concat(process.env.SITE_BASE_URL, "/api/trpc");
    }
    // Fallback to Vercel-provided URLs
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        return "https://".concat(process.env.VERCEL_PROJECT_PRODUCTION_URL, "/api/trpc");
    }
    if (process.env.VERCEL_URL) {
        return "https://".concat(process.env.VERCEL_URL, "/api/trpc");
    }
    // Development fallback
    return 'http://localhost:3001/api/trpc';
}
/**
 * Inner tRPC provider that has access to smart polling context
 */
function TrpcProviderInner(_a) {
    var children = _a.children;
    var queryClient = getQueryClient();
    var refetchInterval = (0, use_smart_polling_1.useSmartPolling)().refetchInterval;
    // Update default query options with smart polling interval
    queryClient.setDefaultOptions({
        queries: __assign(__assign({}, queryClient.getDefaultOptions().queries), { refetchInterval: refetchInterval }),
    });
    var trpcClient = (0, react_1.useState)(function () {
        return (0, client_1.createTRPCClient)({
            links: [
                (0, client_1.loggerLink)({
                    enabled: function (options) {
                        // Log all traffic in dev mode
                        if (process.env.NODE_ENV === 'development') {
                            return true;
                        }
                        // Log errors
                        if (options.direction === 'down' && utils_1.is.error(options.result)) {
                            return true;
                        }
                        return false;
                    },
                }),
                (0, client_1.httpBatchStreamLink)({
                    url: getUrl(),
                    transformer: superjson_1.default,
                }),
            ],
        });
    })[0];
    return ((0, jsx_runtime_1.jsx)(react_query_1.QueryClientProvider, { client: queryClient, children: (0, jsx_runtime_1.jsx)(trpc_1.TRPCProvider, { trpcClient: trpcClient, queryClient: queryClient, children: children }) }));
}
/**
 * Main tRPC provider that includes smart polling
 */
function TrpcProvider(_a) {
    var children = _a.children;
    return ((0, jsx_runtime_1.jsx)(smart_polling_provider_1.SmartPollingProvider, { children: (0, jsx_runtime_1.jsx)(TrpcProviderInner, { children: children }) }));
}
