'use client'
'use strict'
const __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value)
          })
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value))
        } catch (e) {
          reject(e)
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value))
        } catch (e) {
          reject(e)
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected)
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next())
    })
  }
const __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    let _ = {
        label: 0,
        sent() {
          if (t[0] & 1) throw t[1]
          return t[1]
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g = Object.create(
        (typeof Iterator === 'function' ? Iterator : Object).prototype,
      )
    return (
      (g.next = verb(0)),
      (g['throw'] = verb(1)),
      (g['return'] = verb(2)),
      typeof Symbol === 'function' &&
        (g[Symbol.iterator] = function () {
          return this
        }),
      g
    )
    function verb(n) {
      return function (v) {
        return step([n, v])
      }
    }
    function step(op) {
      if (f) throw new TypeError('Generator is already executing.')
      while ((g && ((g = 0), op[0] && (_ = 0)), _)) {
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y['return']
                  : op[0]
                    ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                    : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t
          if (((y = 0), t)) op = [op[0] & 2, t.value]
          switch (op[0]) {
            case 0:
            case 1:
              t = op
              break
            case 4:
              _.label++
              return { value: op[1], done: false }
            case 5:
              _.label++
              y = op[1]
              op = [0]
              continue
            case 7:
              op = _.ops.pop()
              _.trys.pop()
              continue
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0
                continue
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1]
                break
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1]
                t = op
                break
              }
              if (t && _.label < t[2]) {
                _.label = t[2]
                _.ops.push(op)
                break
              }
              if (t[2]) _.ops.pop()
              _.trys.pop()
              continue
          }
          op = body.call(thisArg, _)
        } catch (e) {
          op = [6, e]
          y = 0
        } finally {
          f = t = 0
        }
      }
      if (op[0] & 5) throw op[1]
      return { value: op[0] ? op[1] : void 0, done: true }
    }
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.OrgListApp = OrgListApp
const lucide_react_1 = require('lucide-react')
const react_1 = require('react')
const si_1 = require('react-icons/si')
const jsx_runtime_1 = require('react/jsx-runtime')

const trpc_1 = require('@/client/trpc')
const EmptyState_1 = require('@/components/common/EmptyState')
const layout_1 = require('@/components/layout')
const button_1 = require('@/components/ui/button')
const card_1 = require('@/components/ui/card')
const loading_progress_1 = require('@/components/ui/loading-progress')
const tooltip_1 = require('@/components/ui/tooltip')
const use_trigger_run_1 = require('@/hooks/use-trigger-run')
const utils_1 = require('@/lib/utils')
function OrgListApp() {
  const _this = this
  let _a, _b
  const trpc = (0, trpc_1.useTRPCClient)()
  const _c = (0, react_1.useState)(true),
    isLoading = _c[0],
    setIsLoading = _c[1]
  const _d = (0, react_1.useState)([]),
    orgs = _d[0],
    setOrgs = _d[1]
  const _e = (0, react_1.useState)(null),
    error = _e[0],
    setError = _e[1]
  const _f = (0, react_1.useState)(null),
    triggerHandle = _f[0],
    setTriggerHandle = _f[1]
  const _g = (0, react_1.useState)(false),
    isStartingRefresh = _g[0],
    setIsStartingRefresh = _g[1]
  const GITHUB_APP_SLUG = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || ''
  const installUrl = 'https://github.com/apps/'.concat(
    GITHUB_APP_SLUG,
    '/installations/new',
  )
  const queryOrganizations = (0, react_1.useCallback)(
    function () {
      return __awaiter(_this, void 0, void 0, function () {
        let data
        return __generator(this, function (_a) {
          switch (_a.label) {
            case 0:
              return [4 /*yield*/, trpc.org.listInstalled.query()]
            case 1:
              data = _a.sent()
              return [2 /*return*/, data.orgs]
          }
        })
      })
    },
    [trpc],
  )
  // Track trigger run and update toast with streaming text
  const isRefreshingInstallation = (0, use_trigger_run_1.useTriggerRun)({
    runId:
      (_a =
        triggerHandle === null || triggerHandle === void 0
          ? void 0
          : triggerHandle.runId) !== null && _a !== void 0
        ? _a
        : null,
    publicAccessToken:
      (_b =
        triggerHandle === null || triggerHandle === void 0
          ? void 0
          : triggerHandle.publicAccessToken) !== null && _b !== void 0
        ? _b
        : null,
    onComplete() {
      setTriggerHandle(null)
      setIsStartingRefresh(false)
      // Refresh orgs list after sync completes
      void queryOrganizations().then(function (refreshedOrgs) {
        setOrgs(refreshedOrgs)
      })
    },
    onError(err) {
      console.log('[❌ onError] Run error:', err)
      setTriggerHandle(null)
      setIsStartingRefresh(false)
    },
  }).isLoading
  ;(0, react_1.useEffect)(
    function () {
      let isMounted = true
      void (function () {
        return __awaiter(_this, void 0, void 0, function () {
          let loadedOrgs, e_1
          return __generator(this, function (_a) {
            switch (_a.label) {
              case 0:
                _a.trys.push([0, 2, 3, 4])
                return [4 /*yield*/, queryOrganizations()]
              case 1:
                loadedOrgs = _a.sent()
                if (!isMounted) {
                  return [2 /*return*/]
                }
                setOrgs(loadedOrgs)
                setError(null)
                return [3 /*break*/, 4]
              case 2:
                e_1 = _a.sent()
                if (!isMounted) {
                  return [2 /*return*/]
                }
                setError(
                  e_1 instanceof Error
                    ? e_1.message
                    : 'Failed to load organizations',
                )
                return [3 /*break*/, 4]
              case 3:
                if (!isMounted) {
                  return [2 /*return*/]
                }
                setIsLoading(false)
                return [7 /*endfinally*/]
              case 4:
                return [2 /*return*/]
            }
          })
        })
      })()
      return function () {
        isMounted = false
      }
    },
    [queryOrganizations],
  )
  const handleRefresh = (0, react_1.useCallback)(
    function () {
      return __awaiter(_this, void 0, void 0, function () {
        let result, refreshedOrgs, e_2
        let _a, _b
        return __generator(this, function (_c) {
          switch (_c.label) {
            case 0:
              setIsStartingRefresh(true)
              _c.label = 1
            case 1:
              _c.trys.push([1, 6, 7, 8])
              return [4 /*yield*/, trpc.org.refreshInstallations.mutate()]
            case 2:
              result = _c.sent()
              console.log('[Button]handleRefresh', result)
              // Clear any existing run before starting a new one
              setTriggerHandle(null)
              if (
                !(
                  ((_a = result.triggerHandle) === null || _a === void 0
                    ? void 0
                    : _a.publicAccessToken) &&
                  ((_b = result.triggerHandle) === null || _b === void 0
                    ? void 0
                    : _b.id)
                )
              )
                return [3 /*break*/, 3]
              setTriggerHandle({
                runId: result.triggerHandle.id,
                publicAccessToken: result.triggerHandle.publicAccessToken,
              })
              return [3 /*break*/, 5]
            case 3:
              return [4 /*yield*/, queryOrganizations()]
            case 4:
              refreshedOrgs = _c.sent()
              setOrgs(refreshedOrgs)
              setIsStartingRefresh(false)
              _c.label = 5
            case 5:
              setError(null)
              return [3 /*break*/, 8]
            case 6:
              e_2 = _c.sent()
              console.error('[🔄 Button Clicked] Error:', e_2)
              setError(
                e_2 instanceof Error
                  ? e_2.message
                  : 'Failed to refresh organizations',
              )
              // Error toast will be shown by useTriggerRun hook if runId is set
              setIsStartingRefresh(false)
              return [3 /*break*/, 8]
            case 7:
              setIsLoading(false)
              return [7 /*endfinally*/]
            case 8:
              return [2 /*return*/]
          }
        })
      })
    },
    [queryOrganizations, trpc],
  )
  // Clear isStartingRefresh once the trigger run starts tracking
  ;(0, react_1.useEffect)(
    function () {
      if (isRefreshingInstallation && isStartingRefresh) {
        setIsStartingRefresh(false)
      }
    },
    [isRefreshingInstallation, isStartingRefresh],
  )
  // Button should be disabled while starting refresh or trigger run is loading
  const isRefreshing = isStartingRefresh || isRefreshingInstallation
  if (isLoading) {
    return (0, jsx_runtime_1.jsx)(layout_1.AppLayout, {
      children: (0, jsx_runtime_1.jsx)(loading_progress_1.LoadingProgress, {
        label: 'Loading organizations...',
      }),
    })
  }
  if (error) {
    return (0, jsx_runtime_1.jsx)(layout_1.AppLayout, {
      children: (0, jsx_runtime_1.jsx)('div', {
        className: 'p-6 text-sm text-destructive',
        children: error,
      }),
    })
  }
  if (orgs.length === 0) {
    return (0, jsx_runtime_1.jsx)(layout_1.AppLayout, {
      children: (0, jsx_runtime_1.jsx)(EmptyState_1.EmptyState, {
        kanji: '\u3055\u304F\u305B\u3044',
        kanjiTitle: 'Sakusei - to create.',
        title: 'Connect your team',
        description:
          'Install the GitHub app to get started with your organizations.',
        action: (0, jsx_runtime_1.jsx)(button_1.Button, {
          asChild: true,
          size: 'lg',
          children: (0, jsx_runtime_1.jsx)('a', {
            href: installUrl,
            children: 'Install our GitHub App',
          }),
        }),
      }),
    })
  }
  return (0, jsx_runtime_1.jsx)(layout_1.AppLayout, {
    children: (0, jsx_runtime_1.jsxs)('div', {
      className: 'p-6 flex flex-col h-full overflow-auto',
      children: [
        (0, jsx_runtime_1.jsxs)('div', {
          className: 'flex items-center justify-between gap-4',
          children: [
            (0, jsx_runtime_1.jsx)('h1', {
              className: 'text-xl font-display text-foreground',
              children: 'Teams',
            }),
            (0, jsx_runtime_1.jsxs)('div', {
              className: 'flex items-center gap-2',
              children: [
                (0, jsx_runtime_1.jsxs)(tooltip_1.Tooltip, {
                  children: [
                    (0, jsx_runtime_1.jsx)(tooltip_1.TooltipTrigger, {
                      asChild: true,
                      children: (0, jsx_runtime_1.jsx)(button_1.Button, {
                        variant: 'outline',
                        size: 'icon',
                        onClick() {
                          return void handleRefresh()
                        },
                        disabled: isRefreshing,
                        'aria-label': 'Refresh organizations',
                        children: (0, jsx_runtime_1.jsx)(
                          lucide_react_1.RefreshCw,
                          {
                            className: (0, utils_1.cn)(
                              'h-4 w-4',
                              isRefreshing && 'animate-spin',
                            ),
                          },
                        ),
                      }),
                    }),
                    (0, jsx_runtime_1.jsx)(tooltip_1.TooltipContent, {
                      children: 'Refresh teams and repos',
                    }),
                  ],
                }),
                (0, jsx_runtime_1.jsx)(button_1.Button, {
                  asChild: true,
                  children: (0, jsx_runtime_1.jsx)('a', {
                    href: installUrl,
                    children: 'Add new organization',
                  }),
                }),
              ],
            }),
          ],
        }),
        (0, jsx_runtime_1.jsx)('div', {
          className: 'mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3',
          children: orgs.map(function (org) {
            let _a
            return (0, jsx_runtime_1.jsx)(
              'a',
              {
                href: '/org/'.concat(org.slug),
                className: 'block',
                children: (0, jsx_runtime_1.jsxs)(card_1.Card, {
                  className: 'hover:shadow-md transition-shadow cursor-pointer',
                  children: [
                    (0, jsx_runtime_1.jsx)(card_1.CardHeader, {
                      className: 'pb-2',
                      children: (0, jsx_runtime_1.jsxs)('div', {
                        className: 'flex items-center gap-2',
                        children: [
                          (0, jsx_runtime_1.jsx)(si_1.SiGithub, {
                            className: 'h-4 w-4 text-muted-foreground',
                          }),
                          (0, jsx_runtime_1.jsx)(card_1.CardTitle, {
                            className: 'text-base font-semibold',
                            children:
                              (_a = org.accountName) !== null && _a !== void 0
                                ? _a
                                : org.name,
                          }),
                        ],
                      }),
                    }),
                    (0, jsx_runtime_1.jsxs)(card_1.CardContent, {
                      className: 'space-y-2',
                      children: [
                        (0, jsx_runtime_1.jsxs)('p', {
                          className: 'text-sm text-muted-foreground',
                          children: ['@', org.slug],
                        }),
                        (0, jsx_runtime_1.jsxs)('p', {
                          className: 'text-xs text-muted-foreground',
                          children: [
                            (0, jsx_runtime_1.jsx)('span', {
                              className: 'font-medium text-foreground',
                              children: org.repoCount,
                            }),
                            ' ',
                            org.repoCount === 1 ? 'repository' : 'repositories',
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              },
              org.slug,
            )
          }),
        }),
      ],
    }),
  })
}
