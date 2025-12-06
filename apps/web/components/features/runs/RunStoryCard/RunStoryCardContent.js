"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunStoryCardContent = RunStoryCardContent;
var jsx_runtime_1 = require("react/jsx-runtime");
var useStoryAnalysis_1 = require("./hooks/useStoryAnalysis");
var ConclusionDisplay_1 = require("./components/ConclusionDisplay");
var DecompositionDisplay_1 = require("./components/DecompositionDisplay");
function RunStoryCardContent(_a) {
    var story = _a.story, testResult = _a.testResult, orgName = _a.orgName, repoName = _a.repoName, commitSha = _a.commitSha;
    var _b = (0, useStoryAnalysis_1.useStoryAnalysis)(story, testResult), analysis = _b.analysis, decomposition = _b.decomposition, showDecompositionLoading = _b.showDecompositionLoading;
    var conclusionContent = (function () {
        // Show decomposition data when results are still loading
        if (showDecompositionLoading && decomposition) {
            return ((0, jsx_runtime_1.jsx)(DecompositionDisplay_1.DecompositionDisplay, { decomposition: decomposition, showLoadingState: true }));
        }
        if (!testResult) {
            return ((0, jsx_runtime_1.jsx)("div", { className: "rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground", children: "No evaluation results available yet." }));
        }
        if (!analysis) {
            return ((0, jsx_runtime_1.jsx)("div", { className: "rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground", children: "Evaluation completed without additional analysis details." }));
        }
        return ((0, jsx_runtime_1.jsx)(ConclusionDisplay_1.ConclusionDisplay, { analysis: analysis, storyResultId: testResult.id, orgName: orgName, repoName: repoName, commitSha: commitSha }));
    })();
    return (0, jsx_runtime_1.jsx)("div", { className: "w-full space-y-4", children: conclusionContent });
}
