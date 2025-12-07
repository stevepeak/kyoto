'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.RunStoryCardHeader = RunStoryCardHeader
const lucide_react_1 = require('lucide-react')
const react_markdown_1 = require('react-markdown')
const jsx_runtime_1 = require('react/jsx-runtime')

const button_1 = require('@/components/ui/button')

const utils_1 = require('../utils')
function RunStoryCardHeader(_a) {
  const story = _a.story,
    orgName = _a.orgName,
    repoName = _a.repoName
  const storyTitle = story.story ? story.story.name : 'Story not found'
  const _b = (0, utils_1.getStoryTimestamps)(story),
    startedTimestamp = _b.startedAt,
    completedTimestamp = _b.completedAt,
    durationMs = _b.durationMs
  const durationDisplay = (0, utils_1.formatDurationMs)(durationMs)
  const startedTooltip = startedTimestamp
    ? (0, utils_1.formatDate)(startedTimestamp)
    : undefined
  const completedRelative = completedTimestamp
    ? (0, utils_1.formatRelativeTime)(completedTimestamp)
    : null
  const displayStatus = (0, utils_1.getDisplayStatus)(story)
  const statusPill = (0, utils_1.getStatusPillStyles)(displayStatus)
  const statusDescriptor = statusPill.label.toLowerCase()
  const isRunning = displayStatus === 'running'
  const timelineParts = []
  if (completedRelative && !isRunning) {
    timelineParts.push(completedRelative)
  }
  if (durationDisplay !== '—' && !isRunning) {
    timelineParts.push('in '.concat(durationDisplay))
  }
  const statusLine =
    timelineParts.length > 0
      ? ''.concat(statusDescriptor, ' ').concat(timelineParts.join(' '))
      : statusDescriptor
  const storyUrl = '/org/'
    .concat(orgName, '/repo/')
    .concat(repoName, '/stories/')
    .concat(story.storyId)
  return (0, jsx_runtime_1.jsxs)('div', {
    className:
      'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
    children: [
      (0, jsx_runtime_1.jsx)('div', {
        className: 'flex items-start gap-3 flex-1 min-w-0',
        children: (0, jsx_runtime_1.jsxs)('div', {
          className: 'space-y-2 flex-1 min-w-0',
          children: [
            (0, jsx_runtime_1.jsx)('h3', {
              className: 'text-lg font-semibold text-foreground',
              children: storyTitle,
            }),
            !isRunning &&
              (0, jsx_runtime_1.jsx)('div', {
                className: 'text-sm text-muted-foreground',
                title: startedTooltip,
                children: statusLine,
              }),
            story.summary
              ? (0, jsx_runtime_1.jsx)('div', {
                  className: 'prose prose-sm max-w-none text-muted-foreground',
                  children: (0, jsx_runtime_1.jsx)(react_markdown_1.default, {
                    children: story.summary,
                  }),
                })
              : null,
          ],
        }),
      }),
      (0, jsx_runtime_1.jsx)('div', {
        className: 'shrink-0',
        children: (0, jsx_runtime_1.jsx)(button_1.Button, {
          variant: 'outline',
          size: 'sm',
          asChild: true,
          children: (0, jsx_runtime_1.jsxs)('a', {
            href: storyUrl,
            children: [
              'Open story',
              (0, jsx_runtime_1.jsx)(lucide_react_1.ExternalLink, {
                className: 'ml-2 h-3 w-3',
              }),
            ],
          }),
        }),
      }),
    ],
  })
}
