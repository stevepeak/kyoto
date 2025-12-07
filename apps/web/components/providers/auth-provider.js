'use client'
'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.AuthProvider = AuthProvider
const Sentry = require('@sentry/nextjs')
const react_1 = require('react')
const jsx_runtime_1 = require('react/jsx-runtime')

const auth_client_1 = require('@/client/auth-client')
/**
 * AuthProvider now only handles Sentry user tracking.
 * Authentication redirects are handled by Next.js middleware.
 */
function AuthProvider(_a) {
  let _b, _c
  const children = _a.children
  const session = (0, auth_client_1.useSession)()
  const sessionUser =
    (_c = (_b = session.data) === null || _b === void 0 ? void 0 : _b.user) !==
      null && _c !== void 0
      ? _c
      : null
  ;(0, react_1.useEffect)(
    function () {
      let _a, _b
      if (session.isPending) {
        return
      }
      if (session.error || !sessionUser) {
        Sentry.setUser(null)
        return
      }
      Sentry.setUser({
        id: sessionUser.id,
        email:
          (_a = sessionUser.email) !== null && _a !== void 0 ? _a : undefined,
        username:
          (_b = sessionUser.name) !== null && _b !== void 0 ? _b : undefined,
      })
    },
    [sessionUser, session.error, session.isPending],
  )
  return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children })
}
