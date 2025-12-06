'use client';
"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunDetailView = RunDetailView;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var utils_1 = require("./utils");
var RunDetailHeader_1 = require("./RunDetailHeader");
var RunStoryList_1 = require("./RunStoryList");
var RunStoryCard_1 = require("./RunStoryCard");
function RunDetailView(_a) {
    var _b;
    var run = _a.run, orgName = _a.orgName, repoName = _a.repoName;
    // Console log trigger runId and accessKey when opening a new run
    (0, react_1.useEffect)(function () {
        if (run.extTriggerDev) {
            // TODO server side get the public token then monitor the build
            // TODO get each story too.
            console.log('Trigger.dev Run Info:', run.extTriggerDev);
        }
    }, [run.extTriggerDev]);
    var statusDisplay = (0, utils_1.getStatusDisplay)(run.status);
    var runStatusDescriptor = (0, utils_1.getRunStatusDescriptor)(run.status);
    var commitTitle = (0, utils_1.getCommitTitle)(run.commitMessage, 'Workflow run');
    var shortSha = (0, utils_1.getShortSha)(run.commitSha);
    var relativeStarted = (0, utils_1.formatRelativeTime)(run.createdAt);
    var absoluteStarted = (0, utils_1.formatDate)(run.createdAt);
    var durationMs = new Date(run.updatedAt).getTime() - new Date(run.createdAt).getTime();
    var durationDisplay = (0, utils_1.formatDurationMs)(Number.isFinite(durationMs) && durationMs > 0 ? durationMs : null);
    var commitUrl = run.commitSha && orgName && repoName
        ? "https://github.com/".concat(orgName, "/").concat(repoName, "/commit/").concat(run.commitSha)
        : null;
    var pullRequestUrl = run.prNumber && orgName && repoName
        ? "https://github.com/".concat(orgName, "/").concat(repoName, "/pull/").concat(run.prNumber)
        : null;
    var sortedStories = (0, react_1.useMemo)(function () {
        var statusPriority = {
            fail: 0,
            error: 1,
            running: 2,
            pass: 3,
            skipped: 4,
        };
        return __spreadArray([], run.stories, true).sort(function (a, b) {
            var _a, _b;
            var statusA = (_a = statusPriority[(0, utils_1.getDisplayStatus)(a)]) !== null && _a !== void 0 ? _a : 99;
            var statusB = (_b = statusPriority[(0, utils_1.getDisplayStatus)(b)]) !== null && _b !== void 0 ? _b : 99;
            if (statusA !== statusB) {
                return statusA - statusB;
            }
            return run.stories.indexOf(a) - run.stories.indexOf(b);
        });
    }, [run.stories]);
    var _c = (0, react_1.useState)(function () { var _a, _b; return (_b = (_a = sortedStories[0]) === null || _a === void 0 ? void 0 : _a.storyId) !== null && _b !== void 0 ? _b : null; }), selectedStoryId = _c[0], setSelectedStoryId = _c[1];
    var storyStatusCounts = (0, react_1.useMemo)(function () {
        return run.stories.reduce(function (acc, story) {
            var status = (0, utils_1.getDisplayStatus)(story);
            if (status === 'pass') {
                acc.pass += 1;
            }
            else if (status === 'fail') {
                acc.fail += 1;
            }
            else if (status === 'error') {
                acc.error += 1;
            }
            return acc;
        }, { pass: 0, fail: 0, error: 0 });
    }, [run.stories]);
    var selectedStory = (0, react_1.useMemo)(function () {
        var _a;
        if (selectedStoryId) {
            var match = sortedStories.find(function (story) { return story.storyId === selectedStoryId; });
            if (match) {
                return match;
            }
        }
        return (_a = sortedStories[0]) !== null && _a !== void 0 ? _a : null;
    }, [sortedStories, selectedStoryId]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col", children: [(0, jsx_runtime_1.jsx)("div", { className: "border-b bg-muted/30", children: (0, jsx_runtime_1.jsx)("div", { className: "p-6 space-y-6", children: (0, jsx_runtime_1.jsx)(RunDetailHeader_1.RunDetailHeader, { commitTitle: commitTitle, runStatusDescriptor: runStatusDescriptor, relativeStarted: relativeStarted, absoluteStarted: absoluteStarted, durationDisplay: durationDisplay, statusDisplay: statusDisplay, run: run, shortSha: shortSha, commitUrl: commitUrl, pullRequestUrl: pullRequestUrl, orgName: orgName, repoName: repoName }) }) }), (0, jsx_runtime_1.jsx)("div", { className: "p-6 space-y-6", children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-4 flex flex-wrap items-center gap-2 text-sm", children: [(0, jsx_runtime_1.jsxs)("span", { className: "text-muted-foreground", children: [storyStatusCounts.pass, " passed"] }), (0, jsx_runtime_1.jsxs)("span", { className: "text-muted-foreground", children: [storyStatusCounts.fail, " failed"] }), (0, jsx_runtime_1.jsxs)("span", { className: "text-muted-foreground", children: [storyStatusCounts.error, " errors"] })] }), run.stories.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground", children: "No stories were evaluated in this run." })) : ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-6 lg:flex-row", children: [(0, jsx_runtime_1.jsx)("aside", { className: "lg:w-72 lg:shrink-0", children: (0, jsx_runtime_1.jsx)(RunStoryList_1.RunStoryList, { stories: sortedStories, selectedStoryId: (_b = selectedStory === null || selectedStory === void 0 ? void 0 : selectedStory.storyId) !== null && _b !== void 0 ? _b : null, onStorySelect: setSelectedStoryId }) }), (0, jsx_runtime_1.jsx)("section", { className: "flex-1 min-w-0", children: selectedStory ? ((0, jsx_runtime_1.jsx)(RunStoryCard_1.RunStoryCard, { story: selectedStory, testResult: selectedStory.testResult, orgName: orgName, repoName: repoName, commitSha: run.commitSha })) : ((0, jsx_runtime_1.jsx)("div", { className: "rounded-md border border-dashed bg-muted/40 p-6 text-sm text-muted-foreground", children: "Select a story to inspect the analysis details." })) })] }))] }) })] }));
}
