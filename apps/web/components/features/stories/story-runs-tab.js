'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.StoryRunsTab = StoryRunsTab
const jsx_runtime_1 = require('react/jsx-runtime')

const button_1 = require('@/components/ui/button')
function StoryRunsTab(_a) {
  const isTesting = _a.isTesting,
    onTest = _a.onTest
  return (0, jsx_runtime_1.jsxs)('div', {
    className: 'p-6',
    children: [
      (0, jsx_runtime_1.jsxs)('div', {
        className: 'flex items-center justify-between mb-4',
        children: [
          (0, jsx_runtime_1.jsx)('h2', {
            className: 'text-lg font-semibold',
            children: 'Recent Runs',
          }),
          (0, jsx_runtime_1.jsx)(button_1.Button, {
            variant: 'outline',
            onClick: onTest,
            disabled: isTesting,
            children: isTesting ? 'Testing...' : 'Test',
          }),
        ],
      }),
      (0, jsx_runtime_1.jsx)('div', {
        className: 'text-sm text-muted-foreground',
        children: 'Recent runs will be displayed here.',
      }),
    ],
  })
}
