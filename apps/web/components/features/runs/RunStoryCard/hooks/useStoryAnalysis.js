"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStoryAnalysis = useStoryAnalysis;
var react_1 = require("react");
var DecompositionParser_1 = require("../DecompositionParser");
var utils_1 = require("../../utils");
/**
 * Hook to parse and analyze story data including decomposition and test results
 */
function useStoryAnalysis(story, testResult) {
    return (0, react_1.useMemo)(function () {
        var _a, _b;
        var analysis = (_a = testResult === null || testResult === void 0 ? void 0 : testResult.analysis) !== null && _a !== void 0 ? _a : null;
        var displayStatus = (0, utils_1.getDisplayStatus)(story);
        var isRunning = displayStatus === 'running';
        var decomposition = (0, DecompositionParser_1.parseDecomposition)((_b = story.story) === null || _b === void 0 ? void 0 : _b.decomposition);
        var showDecompositionLoading = (!testResult || isRunning) && decomposition !== null;
        return {
            analysis: analysis,
            decomposition: decomposition,
            displayStatus: displayStatus,
            isRunning: isRunning,
            showDecompositionLoading: showDecompositionLoading,
        };
    }, [story, testResult]);
}
