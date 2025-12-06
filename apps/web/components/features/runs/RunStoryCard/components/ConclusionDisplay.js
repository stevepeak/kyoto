"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConclusionDisplay = ConclusionDisplay;
var jsx_runtime_1 = require("react/jsx-runtime");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
var utils_2 = require("../../utils");
var EvidenceList_1 = require("./EvidenceList");
function ConclusionDisplay(_a) {
    var _b, _c;
    var analysis = _a.analysis, storyResultId = _a.storyResultId, orgName = _a.orgName, repoName = _a.repoName, commitSha = _a.commitSha;
    var status = analysis.status;
    if (status !== 'pass' && status !== 'fail' && status !== 'error') {
        // Skip rendering conclusion for 'running' or 'skipped' status
        return null;
    }
    var conclusionStyles = (0, utils_2.getConclusionStyles)(status);
    // Filter out given steps - only show requirement steps
    var requirementSteps = (_c = (_b = analysis.steps) === null || _b === void 0 ? void 0 : _b.filter(function (step) { return step.type === 'requirement'; })) !== null && _c !== void 0 ? _c : [];
    // Don't render if there are no requirement steps
    if (requirementSteps.length === 0) {
        return null;
    }
    // Group steps by goal (for requirement steps, goal is the outcome)
    var stepsByGoal = new Map();
    requirementSteps.forEach(function (step) {
        var goal = step.outcome;
        if (!stepsByGoal.has(goal)) {
            stepsByGoal.set(goal, []);
        }
        stepsByGoal.get(goal).push(step);
    });
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [status === 'fail' || status === 'error' ? ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)('rounded-md border p-4 sm:p-5', conclusionStyles.container), children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-semibold text-foreground", children: conclusionStyles.label }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-sm text-foreground", children: analysis.explanation })] })) : null, (0, jsx_runtime_1.jsx)("div", { className: "space-y-4", children: Array.from(stepsByGoal.entries()).map(function (_a) {
                    var goal = _a[0], steps = _a[1];
                    return ((0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: (0, jsx_runtime_1.jsx)("div", { className: "space-y-2", children: steps.map(function (step, stepIndex) {
                                var conclusionDisplay = (0, utils_2.getEvidenceConclusionDisplay)(step.conclusion === 'pass' ? 'pass' : 'fail');
                                return ((0, jsx_runtime_1.jsxs)("details", { className: "group rounded-md border bg-muted/40 text-sm text-foreground", children: [(0, jsx_runtime_1.jsxs)("summary", { className: "flex w-full cursor-pointer select-none items-center gap-2 px-3 py-3 text-left [&::-webkit-details-marker]:hidden", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: "size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" }), (0, jsx_runtime_1.jsx)(conclusionDisplay.Icon, { "aria-label": conclusionDisplay.label, className: (0, utils_1.cn)('size-4 shrink-0', conclusionDisplay.iconClassName) }), (0, jsx_runtime_1.jsx)("span", { className: "truncate text-sm font-medium text-foreground", children: step.outcome })] }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-3 border-t px-3 py-3 text-sm text-foreground", children: step.assertions && step.assertions.length > 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "space-y-2", children: step.assertions.map(function (assertion, assertionIndex) {
                                                    var isPassed = step.conclusion === 'pass';
                                                    var assertionStyles = isPassed
                                                        ? 'border-chart-1/40 bg-chart-1/10'
                                                        : 'border-destructive/40 bg-destructive/10';
                                                    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)('rounded-md border p-3', assertionStyles), children: [(0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)('text-sm font-medium', isPassed
                                                                    ? 'text-chart-1'
                                                                    : 'text-destructive'), children: assertion.fact }), !isPassed && ((0, jsx_runtime_1.jsx)("div", { className: "mt-2 text-xs text-muted-foreground", children: assertion.reason ||
                                                                    'Reason not available - to be added later' })), assertion.evidence &&
                                                                assertion.evidence.length > 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "mt-2", children: (0, jsx_runtime_1.jsx)(EvidenceList_1.EvidenceList, { evidence: assertion.evidence, orgName: orgName, repoName: repoName, commitSha: commitSha }) })) : null] }, "".concat(storyResultId, "-assertion-").concat(goal, "-").concat(stepIndex, "-").concat(assertionIndex)));
                                                }) })) : null })] }, "".concat(storyResultId, "-step-").concat(goal, "-").concat(stepIndex)));
                            }) }) }, goal));
                }) })] }));
}
