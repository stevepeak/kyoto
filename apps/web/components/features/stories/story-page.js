'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.StoryPage = StoryPage
const jsx_runtime_1 = require('react/jsx-runtime')

const story_loader_1 = require('./story-loader')
function StoryPage(_a) {
  const orgName = _a.orgName,
    repoName = _a.repoName,
    storyId = _a.storyId
  return (0, jsx_runtime_1.jsx)(story_loader_1.StoryLoader, {
    orgName,
    repoName,
    storyId,
  })
}
