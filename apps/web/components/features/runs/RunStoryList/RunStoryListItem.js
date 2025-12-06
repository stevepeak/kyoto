"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunStoryListItem = RunStoryListItem;
var jsx_runtime_1 = require("react/jsx-runtime");
var utils_1 = require("@/lib/utils");
var StoryStatusCheck_1 = require("../shared/StoryStatusCheck");
var utils_2 = require("../utils");
function RunStoryListItem(_a) {
    var story = _a.story, isSelected = _a.isSelected, onSelect = _a.onSelect;
    var storyTitle = story.story ? story.story.name : 'Story not found';
    var _b = (0, utils_2.getStoryTimestamps)(story), completedTimestamp = _b.completedAt, durationMs = _b.durationMs;
    var durationDisplay = (0, utils_2.formatDurationMs)(durationMs);
    var completedRelative = completedTimestamp
        ? (0, utils_2.formatRelativeTime)(completedTimestamp)
        : null;
    var displayStatus = (0, utils_2.getDisplayStatus)(story);
    var isRunning = displayStatus === 'running';
    return ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onSelect, className: (0, utils_1.cn)('w-full rounded-md border px-3 py-3 text-left transition-colors', isSelected
                ? 'border-primary bg-primary/10 text-primary-foreground'
                : 'border-border hover:bg-muted'), children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-3", children: [(0, jsx_runtime_1.jsx)(StoryStatusCheck_1.StoryStatusCheck, { status: displayStatus }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0 space-y-1", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-between gap-2", children: (0, jsx_runtime_1.jsx)("span", { className: "truncate text-sm font-medium text-foreground", children: storyTitle }) }), !isRunning && ((0, jsx_runtime_1.jsx)("div", { className: "text-xs text-muted-foreground", children: completedRelative
                                    ? "".concat(completedRelative).concat(durationDisplay !== '—' ? " \u00B7 ".concat(durationDisplay) : '')
                                    : durationDisplay !== '—'
                                        ? "Duration ".concat(durationDisplay)
                                        : 'Awaiting completion' }))] })] }) }) }));
}
