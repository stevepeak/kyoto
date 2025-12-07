'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.RunList = RunList
const jsx_runtime_1 = require('react/jsx-runtime')

const EmptyState_1 = require('@/components/common/EmptyState')

const utils_1 = require('./utils')
function mapRunStatusToDetailStatus(status) {
  switch (status) {
    case 'success':
      return 'pass'
    case 'failed':
      return 'fail'
    case 'skipped':
      return 'skipped'
    case 'running':
      return 'running'
    case 'error':
      return 'error'
    case 'queued':
      return 'running'
  }
}
function RunList(_a) {
  const runs = _a.runs,
    orgName = _a.orgName,
    repoName = _a.repoName
  if (runs.length === 0) {
    return (0, jsx_runtime_1.jsx)(EmptyState_1.EmptyState, {
      kanji: '\u3044\u3068\u304B\u3093\u3057\u3087\u3046',
      kanjiTitle: 'Ito-kensh\u014D - intent testing.',
      title: 'What is intent testing?',
      description:
        "Your commits and pull requests will soon be tested with Kyoto's intent testing, an AI powered QA platform with the goal of preventing regressions and shipping code that works according to the intent behind your stories.",
    })
  }
  return (0, jsx_runtime_1.jsx)('ul', {
    className: 'divide-y',
    children: runs.map(function (run) {
      const detailStatus = mapRunStatusToDetailStatus(run.status)
      const statusDisplay = (0, utils_1.getStatusDisplay)(detailStatus)
      const StatusIcon = statusDisplay.Icon
      const commitTitle = (0, utils_1.getCommitTitle)(run.commitMessage)
      const shortSha = (0, utils_1.getShortSha)(run.commitSha, '—')
      const relativeTime = (0, utils_1.formatRelativeTime)(run.createdAt)
      const durationDisplay = (0, utils_1.formatDurationMs)(run.durationMs)
      return (0, jsx_runtime_1.jsx)(
        'li',
        {
          children: (0, jsx_runtime_1.jsxs)('a', {
            href: '/org/'
              .concat(orgName, '/repo/')
              .concat(repoName, '/runs/')
              .concat(run.runId),
            className:
              'flex items-start gap-3 py-3 px-4 hover:bg-accent/50 transition-colors',
            children: [
              (0, jsx_runtime_1.jsx)('div', {
                className: 'mt-0.5',
                children: (0, jsx_runtime_1.jsx)(StatusIcon, {
                  className: 'size-4 '
                    .concat(statusDisplay.chipIconClassName, ' ')
                    .concat(statusDisplay.shouldSpin ? 'animate-spin' : ''),
                }),
              }),
              (0, jsx_runtime_1.jsxs)('div', {
                className: 'flex-1 min-w-0',
                children: [
                  (0, jsx_runtime_1.jsx)('div', {
                    className: 'flex items-center gap-2',
                    children: (0, jsx_runtime_1.jsx)('span', {
                      className: 'font-medium text-foreground',
                      children: commitTitle,
                    }),
                  }),
                  (0, jsx_runtime_1.jsxs)('div', {
                    className: 'text-xs text-muted-foreground mt-1',
                    children: [
                      (0, jsx_runtime_1.jsxs)('span', {
                        children: ['CI #', run.runId, ': Commit ', shortSha],
                      }),
                      ' • ',
                      (0, jsx_runtime_1.jsx)('span', {
                        children: relativeTime,
                      }),
                      ' • ',
                      (0, jsx_runtime_1.jsx)('span', {
                        children: durationDisplay,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        },
        run.id,
      )
    }),
  })
}
