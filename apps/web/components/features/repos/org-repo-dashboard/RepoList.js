'use client'
'use strict'
const __spreadArray =
  (this && this.__spreadArray) ||
  function (to, from, pack) {
    if (pack || arguments.length === 2) {
      for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i)
          ar[i] = from[i]
        }
      }
    }
    return to.concat(ar || Array.prototype.slice.call(from))
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.RepoList = RepoList
const lucide_react_1 = require('lucide-react')
const lucide_react_2 = require('lucide-react')
const react_1 = require('react')
const jsx_runtime_1 = require('react/jsx-runtime')

const EmptyState_1 = require('@/components/common/EmptyState')
const button_1 = require('@/components/ui/button')
const utils_1 = require('@/lib/utils')

const formatRelativeTime_1 = require('./utils/formatRelativeTime')
const formatStoryCount_1 = require('./utils/formatStoryCount')
const statusConfig = {
  pass: {
    label: 'Passed',
    dotClass: 'bg-chart-1',
  },
  fail: {
    label: 'Failed',
    dotClass: 'bg-destructive',
  },
  skipped: {
    label: 'Skipped',
    dotClass: 'bg-muted-foreground',
  },
  running: {
    label: 'Running',
    dotClass: 'bg-primary',
  },
  error: {
    label: 'Error',
    dotClass: 'bg-orange-500',
  },
}
function RepoList(_a) {
  const org = _a.org,
    repos = _a.repos,
    onOpenDialog = _a.onOpenDialog
  const displayedRepos = (0, react_1.useMemo)(
    function () {
      return __spreadArray([], repos, true).sort(function (a, b) {
        return a.name.localeCompare(b.name)
      })
    },
    [repos],
  )
  if (repos.length === 0) {
    return (0, jsx_runtime_1.jsx)(EmptyState_1.EmptyState, {
      kanji: '\u305B\u3064\u305E\u304F',
      kanjiTitle: 'Setsuzoku - to connect.',
      title: 'Connect your first repository',
      description:
        'Enable your first repository to start tracking stories, CI runs, and more. Connect a repository to begin monitoring your codebase and ensuring it aligns with your requirements.',
      action: (0, jsx_runtime_1.jsxs)(button_1.Button, {
        onClick: onOpenDialog,
        size: 'lg',
        className: 'gap-2',
        children: [
          (0, jsx_runtime_1.jsx)(lucide_react_2.Plus, { className: 'h-5 w-5' }),
          (0, jsx_runtime_1.jsx)('span', { children: 'Connect Repository' }),
        ],
      }),
    })
  }
  if (displayedRepos.length === 0) {
    return (0, jsx_runtime_1.jsx)(EmptyState_1.EmptyState, {
      title: 'No repositories match your search',
      description:
        'Try adjusting your filters or clear the search to view all repositories.',
    })
  }
  return (0, jsx_runtime_1.jsx)('ul', {
    className: 'overflow-hidden rounded-lg border border-border bg-card',
    children: displayedRepos.map(function (repo) {
      const statusMeta = repo.lastRunStatus
        ? statusConfig[repo.lastRunStatus]
        : null
      const relativeTime = (0, formatRelativeTime_1.formatRelativeTime)(
        repo.lastRunAt,
      )
      return (0, jsx_runtime_1.jsx)(
        'li',
        {
          className: 'border-b border-border last:border-b-0',
          children: (0, jsx_runtime_1.jsx)('a', {
            href: '/org/'
              .concat(
                org === null || org === void 0 ? void 0 : org.slug,
                '/repo/',
              )
              .concat(repo.name),
            className: 'block px-6 py-5 cursor-pointer',
            children: (0, jsx_runtime_1.jsxs)('div', {
              className: 'flex flex-col gap-3',
              children: [
                (0, jsx_runtime_1.jsxs)('div', {
                  className: 'flex flex-wrap items-center gap-2',
                  children: [
                    (0, jsx_runtime_1.jsx)('span', {
                      className: 'text-base font-semibold text-primary',
                      children: repo.name,
                    }),
                    (0, jsx_runtime_1.jsx)('span', {
                      className:
                        'rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground',
                      children: repo.isPrivate ? 'Private' : 'Public',
                    }),
                  ],
                }),
                (0, jsx_runtime_1.jsxs)('div', {
                  className:
                    'flex flex-wrap items-center gap-5 text-sm text-muted-foreground',
                  children: [
                    (0, jsx_runtime_1.jsx)('div', {
                      className: 'flex items-center gap-2',
                      children: (0, jsx_runtime_1.jsx)('span', {
                        children: (0, formatStoryCount_1.formatStoryCount)(
                          repo.storyCount,
                        ),
                      }),
                    }),
                    (0, jsx_runtime_1.jsx)('div', {
                      className: 'flex items-center gap-2',
                      children: statusMeta
                        ? (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, {
                            children: [
                              (0, jsx_runtime_1.jsx)('span', {
                                className: (0, utils_1.cn)(
                                  'h-2 w-2 rounded-full',
                                  statusMeta.dotClass,
                                ),
                              }),
                              (0, jsx_runtime_1.jsxs)('span', {
                                className: 'text-muted-foreground',
                                children: [
                                  'Last CI run ',
                                  statusMeta.label.toLowerCase(),
                                  relativeTime
                                    ? ' \u2022 '.concat(relativeTime)
                                    : '',
                                ],
                              }),
                            ],
                          })
                        : (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, {
                            children: [
                              (0, jsx_runtime_1.jsx)(lucide_react_1.Clock3, {
                                className: 'h-4 w-4 text-muted-foreground',
                              }),
                              (0, jsx_runtime_1.jsx)('span', {
                                children: 'No CI runs yet',
                              }),
                            ],
                          }),
                    }),
                  ],
                }),
              ],
            }),
          }),
        },
        repo.id,
      )
    }),
  })
}
