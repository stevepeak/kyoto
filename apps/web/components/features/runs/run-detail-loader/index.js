'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.RunDetailLoader = RunDetailLoader
const react_1 = require('react')
const jsx_runtime_1 = require('react/jsx-runtime')

const layout_1 = require('@/components/layout')
const loading_progress_1 = require('@/components/ui/loading-progress')

const RunDetailContent_1 = require('./RunDetailContent')
function RunDetailLoader(_a) {
  const orgName = _a.orgName,
    repoName = _a.repoName,
    runId = _a.runId
  return (0, jsx_runtime_1.jsx)(react_1.Suspense, {
    fallback: (0, jsx_runtime_1.jsx)(layout_1.AppLayout, {
      breadcrumbs: [
        { label: orgName, href: '/org/'.concat(orgName) },
        {
          label: repoName,
          href: '/org/'.concat(orgName, '/repo/').concat(repoName),
        },
      ],
      children: (0, jsx_runtime_1.jsx)(loading_progress_1.LoadingProgress, {
        label: 'Loading run...',
      }),
    }),
    children: (0, jsx_runtime_1.jsx)(RunDetailContent_1.RunDetailContent, {
      orgName,
      repoName,
      runId,
    }),
  })
}
