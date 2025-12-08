'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.formatStoryCount = formatStoryCount
function formatStoryCount(count) {
  return ''.concat(count, ' ').concat(count === 1 ? 'story' : 'stories')
}
