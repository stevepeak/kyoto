'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.RunStoryCard = RunStoryCard
const jsx_runtime_1 = require('react/jsx-runtime')

const card_1 = require('@/components/ui/card')

const RunStoryCardContent_1 = require('./RunStoryCardContent')
const RunStoryCardHeader_1 = require('./RunStoryCardHeader')
function RunStoryCard(_a) {
  const story = _a.story,
    testResult = _a.testResult,
    orgName = _a.orgName,
    repoName = _a.repoName,
    commitSha = _a.commitSha
  return (0, jsx_runtime_1.jsx)(card_1.Card, {
    className: 'border bg-background',
    children: (0, jsx_runtime_1.jsxs)(card_1.CardContent, {
      children: [
        (0, jsx_runtime_1.jsx)(RunStoryCardHeader_1.RunStoryCardHeader, {
          story,
          orgName,
          repoName,
        }),
        (0, jsx_runtime_1.jsx)(RunStoryCardContent_1.RunStoryCardContent, {
          story,
          testResult,
          orgName,
          repoName,
          commitSha,
        }),
      ],
    }),
  })
}
