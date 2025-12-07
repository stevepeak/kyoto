'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.RunStoryList = RunStoryList
const jsx_runtime_1 = require('react/jsx-runtime')

const RunStoryListItem_1 = require('./RunStoryListItem')
function RunStoryList(_a) {
  const stories = _a.stories,
    selectedStoryId = _a.selectedStoryId,
    onStorySelect = _a.onStorySelect
  return (0, jsx_runtime_1.jsx)('ul', {
    className: 'space-y-2',
    children: stories.map(function (runStory) {
      return (0, jsx_runtime_1.jsx)(
        RunStoryListItem_1.RunStoryListItem,
        {
          story: runStory,
          isSelected: selectedStoryId === runStory.storyId,
          onSelect() {
            return onStorySelect(runStory.storyId)
          },
        },
        runStory.storyId,
      )
    }),
  })
}
