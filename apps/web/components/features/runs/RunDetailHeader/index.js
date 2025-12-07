'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.RunDetailHeader = RunDetailHeader
const jsx_runtime_1 = require('react/jsx-runtime')

const RunDetailCommitBlock_1 = require('./RunDetailCommitBlock')
const RunDetailTitle_1 = require('./RunDetailTitle')
function RunDetailHeader(_a) {
  const commitTitle = _a.commitTitle,
    runStatusDescriptor = _a.runStatusDescriptor,
    relativeStarted = _a.relativeStarted,
    absoluteStarted = _a.absoluteStarted,
    durationDisplay = _a.durationDisplay,
    statusDisplay = _a.statusDisplay,
    run = _a.run,
    shortSha = _a.shortSha,
    commitUrl = _a.commitUrl,
    pullRequestUrl = _a.pullRequestUrl,
    orgName = _a.orgName,
    repoName = _a.repoName
  return (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, {
    children: [
      (0, jsx_runtime_1.jsx)(RunDetailTitle_1.RunDetailTitle, {
        commitTitle,
        runStatusDescriptor,
        relativeStarted,
        absoluteStarted,
        durationDisplay,
        statusDisplay,
        run,
        shortSha,
        commitUrl,
        orgName,
        repoName,
      }),
      (0, jsx_runtime_1.jsx)(RunDetailCommitBlock_1.RunDetailCommitBlock, {
        run,
        pullRequestUrl,
      }),
    ],
  })
}
