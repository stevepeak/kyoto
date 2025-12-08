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
exports.RepoOverview = RepoOverview
const lucide_react_1 = require('lucide-react')
const navigation_1 = require('next/navigation')
const react_1 = require('react')
const react_hotkeys_hook_1 = require('react-hotkeys-hook')
const si_1 = require('react-icons/si')
const jsx_runtime_1 = require('react/jsx-runtime')

const trpc_1 = require('@/client/trpc')
const keyboard_shortcut_hint_1 = require('@/components/common/keyboard-shortcut-hint')
const RunList_1 = require('@/components/features/runs/RunList')
const story_list_1 = require('@/components/features/stories/story-list')
const layout_1 = require('@/components/layout')
const button_1 = require('@/components/ui/button')
const use_trigger_run_1 = require('@/hooks/use-trigger-run')
function RepoOverview(_a) {
  const _this = this
  let _b, _c
  const orgName = _a.orgName,
    repoName = _a.repoName,
    defaultBranch = _a.defaultBranch,
    runs = _a.runs,
    stories = _a.stories,
    onRefreshRuns = _a.onRefreshRuns,
    onRefreshStories = _a.onRefreshStories
  const trpc = (0, trpc_1.useTRPCClient)()
  const router = (0, navigation_1.useRouter)()
  const _d = (0, react_1.useState)(false),
    isCreatingRun = _d[0],
    setIsCreatingRun = _d[1]
  const _e = (0, react_1.useState)(null),
    createError = _e[0],
    setCreateError = _e[1]
  const _f = (0, react_1.useState)(null),
    triggerHandle = _f[0],
    setTriggerHandle = _f[1]
  // Use trigger run hook to track CI runs with built-in toast
  ;(0, use_trigger_run_1.useTriggerRun)({
    runId:
      (_b =
        triggerHandle === null || triggerHandle === void 0
          ? void 0
          : triggerHandle.runId) !== null && _b !== void 0
        ? _b
        : null,
    publicAccessToken:
      (_c =
        triggerHandle === null || triggerHandle === void 0
          ? void 0
          : triggerHandle.publicAccessToken) !== null && _c !== void 0
        ? _c
        : null,
    onComplete() {
      // Clear trigger handle after completion
      setTriggerHandle(null)
      // Refresh runs list
      if (onRefreshRuns) {
        onRefreshRuns()
      }
    },
    onError() {
      // Clear trigger handle after error
      setTriggerHandle(null)
    },
  })
  // Check if any CI build is in progress
  const hasRunningBuild = runs.some(function (run) {
    return run.status === 'queued' || run.status === 'running'
  })
  ;(0, react_hotkeys_hook_1.useHotkeys)(
    'mod+enter',
    function () {
      router.push(
        '/org/'.concat(orgName, '/repo/').concat(repoName, '/stories/new'),
      )
    },
    { preventDefault: true },
  )
  const handleStartRun = function () {
    return __awaiter(_this, void 0, void 0, function () {
      let result, error_1
      let _a, _b
      return __generator(this, function (_c) {
        switch (_c.label) {
          case 0:
            if (!defaultBranch) {
              return [2 /*return*/]
            }
            setIsCreatingRun(true)
            setCreateError(null)
            _c.label = 1
          case 1:
            _c.trys.push([1, 3, 4, 5])
            return [
              4 /*yield*/,
              trpc.run.create.mutate({
                orgName,
                repoName,
              }),
              // Set trigger handle to start tracking with toast
            ]
          case 2:
            result = _c.sent()
            // Set trigger handle to start tracking with toast
            if (
              ((_a = result.triggerHandle) === null || _a === void 0
                ? void 0
                : _a.publicAccessToken) &&
              ((_b = result.triggerHandle) === null || _b === void 0
                ? void 0
                : _b.id)
            ) {
              setTriggerHandle({
                runId: result.triggerHandle.id,
                publicAccessToken: result.triggerHandle.publicAccessToken,
              })
              // Refresh runs list after successful creation
              if (onRefreshRuns) {
                onRefreshRuns()
              }
            } else {
              setCreateError('Failed to get run tracking information')
            }
            return [3 /*break*/, 5]
          case 3:
            error_1 = _c.sent()
            setCreateError(
              error_1 instanceof Error
                ? error_1.message
                : 'Failed to start run',
            )
            return [3 /*break*/, 5]
          case 4:
            setIsCreatingRun(false)
            return [7 /*endfinally*/]
          case 5:
            return [2 /*return*/]
        }
      })
    })
  }
  return (0, jsx_runtime_1.jsx)(layout_1.AppLayout, {
    breadcrumbs: [
      { label: orgName, href: '/org/'.concat(orgName) },
      {
        label: repoName,
        href: '/org/'.concat(orgName, '/repo/').concat(repoName),
      },
    ],
    children: (0, jsx_runtime_1.jsxs)('div', {
      className: 'p-6 flex flex-col h-full overflow-auto',
      children: [
        (0, jsx_runtime_1.jsxs)('div', {
          className: 'flex items-center justify-between mb-6',
          children: [
            (0, jsx_runtime_1.jsxs)('h1', {
              className:
                'text-xl font-semibold text-foreground flex items-center gap-2',
              children: [
                (0, jsx_runtime_1.jsx)('a', {
                  href: 'https://github.com/'
                    .concat(orgName, '/')
                    .concat(repoName),
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  className: 'hover:opacity-70 transition-opacity',
                  'aria-label': 'View repository on GitHub',
                  children: (0, jsx_runtime_1.jsx)(si_1.SiGithub, {
                    className: 'h-5 w-5',
                  }),
                }),
                (0, jsx_runtime_1.jsx)('span', { children: repoName }),
              ],
            }),
            (0, jsx_runtime_1.jsx)('div', {
              className: 'flex items-center gap-3',
            }),
          ],
        }),
        createError &&
          (0, jsx_runtime_1.jsx)('div', {
            className:
              'mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md',
            children: createError,
          }),
        (0, jsx_runtime_1.jsxs)('div', {
          className: 'mt-6 grid grid-cols-1 md:grid-cols-2 gap-6',
          children: [
            (0, jsx_runtime_1.jsx)('div', {
              children: (0, jsx_runtime_1.jsxs)('div', {
                className: 'border rounded-md overflow-hidden',
                children: [
                  (0, jsx_runtime_1.jsxs)('div', {
                    className:
                      'flex items-center justify-between bg-muted px-4 py-2 border-b',
                    children: [
                      (0, jsx_runtime_1.jsx)('div', {
                        className: 'flex items-center gap-2',
                        children:
                          stories.length > 0 &&
                          (0, jsx_runtime_1.jsxs)('span', {
                            className: 'text-sm text-muted-foreground',
                            children: [
                              stories.length,
                              ' ',
                              stories.length === 1 ? 'story' : 'stories',
                            ],
                          }),
                      }),
                      stories.length > 0 &&
                        (0, jsx_runtime_1.jsx)(button_1.Button, {
                          asChild: true,
                          variant: 'default',
                          size: 'sm',
                          children: (0, jsx_runtime_1.jsxs)('a', {
                            href: '/org/'
                              .concat(orgName, '/repo/')
                              .concat(repoName, '/stories/new'),
                            children: [
                              'Craft new story',
                              (0, jsx_runtime_1.jsx)(
                                keyboard_shortcut_hint_1.KeyboardShortcutHint,
                                {},
                              ),
                            ],
                          }),
                        }),
                    ],
                  }),
                  (0, jsx_runtime_1.jsx)('div', {
                    className: 'max-h-[600px] overflow-auto',
                    children: (0, jsx_runtime_1.jsx)(story_list_1.StoryList, {
                      stories,
                      orgName,
                      repoName,
                      onStoriesChange: onRefreshStories,
                    }),
                  }),
                ],
              }),
            }),
            (0, jsx_runtime_1.jsx)('div', {
              children: (0, jsx_runtime_1.jsxs)('div', {
                className: 'border rounded-md overflow-hidden',
                children: [
                  (0, jsx_runtime_1.jsxs)('div', {
                    className:
                      'flex items-center justify-between bg-muted px-4 py-2 border-b',
                    children: [
                      (0, jsx_runtime_1.jsx)('div', {
                        className: 'flex items-center gap-2',
                        children:
                          runs.length > 0 &&
                          (0, jsx_runtime_1.jsxs)('span', {
                            className: 'text-sm text-muted-foreground',
                            children: [
                              runs.length,
                              ' ',
                              runs.length === 1 ? 'run' : 'runs',
                            ],
                          }),
                      }),
                      defaultBranch &&
                        stories.length > 0 &&
                        (0, jsx_runtime_1.jsx)(button_1.Button, {
                          disabled: isCreatingRun || hasRunningBuild,
                          variant: 'outline',
                          size: 'sm',
                          onClick: handleStartRun,
                          children: isCreatingRun
                            ? 'Starting...'
                            : hasRunningBuild
                              ? (0, jsx_runtime_1.jsxs)(
                                  jsx_runtime_1.Fragment,
                                  {
                                    children: [
                                      (0, jsx_runtime_1.jsx)(
                                        lucide_react_1.Loader2,
                                        {
                                          className:
                                            'mr-2 h-4 w-4 animate-spin',
                                        },
                                      ),
                                      'Tests running...',
                                    ],
                                  },
                                )
                              : 'Begin new run',
                        }),
                    ],
                  }),
                  (0, jsx_runtime_1.jsx)(RunList_1.RunList, {
                    runs,
                    orgName,
                    repoName,
                  }),
                ],
              }),
            }),
          ],
        }),
      ],
    }),
  })
}
