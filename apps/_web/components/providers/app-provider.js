'use client'
'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.AppProvider = AppProvider
const react_1 = require('react')
const jsx_runtime_1 = require('react/jsx-runtime')

const sonner_1 = require('../ui/sonner')
const auth_provider_1 = require('./auth-provider')
const trpc_provider_1 = require('./trpc-provider')
function AppProvider(_a) {
  const children = _a.children
  // Only render Toaster after hydration to prevent mismatches
  const _b = (0, react_1.useState)(false),
    mounted = _b[0],
    setMounted = _b[1]
  ;(0, react_1.useEffect)(function () {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Client-side mounting pattern for Next.js
    setMounted(true)
  }, [])
  return (0, jsx_runtime_1.jsx)(trpc_provider_1.TrpcProvider, {
    children: (0, jsx_runtime_1.jsxs)(auth_provider_1.AuthProvider, {
      children: [
        children,
        mounted && (0, jsx_runtime_1.jsx)(sonner_1.Toaster, {}),
      ],
    }),
  })
}
