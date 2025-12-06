"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunStoryList = RunStoryList;
var jsx_runtime_1 = require("react/jsx-runtime");
var RunStoryListItem_1 = require("./RunStoryListItem");
function RunStoryList(_a) {
    var stories = _a.stories, selectedStoryId = _a.selectedStoryId, onStorySelect = _a.onStorySelect;
    return ((0, jsx_runtime_1.jsx)("ul", { className: "space-y-2", children: stories.map(function (runStory) { return ((0, jsx_runtime_1.jsx)(RunStoryListItem_1.RunStoryListItem, { story: runStory, isSelected: selectedStoryId === runStory.storyId, onSelect: function () { return onStorySelect(runStory.storyId); } }, runStory.storyId)); }) }));
}
