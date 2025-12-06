"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecompositionDisplay = DecompositionDisplay;
var jsx_runtime_1 = require("react/jsx-runtime");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
var utils_2 = require("../../utils");
function DecompositionDisplay(_a) {
    var _b;
    var decomposition = _a.decomposition, _c = _a.showLoadingState, showLoadingState = _c === void 0 ? false : _c;
    var requirementSteps = (_b = decomposition.steps.filter(function (step) { return step.type === 'requirement'; })) !== null && _b !== void 0 ? _b : [];
    if (requirementSteps.length === 0) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground", children: "No decomposition steps available yet." }));
    }
    var loadingDisplay = (0, utils_2.getLoadingConclusionDisplay)();
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [showLoadingState && ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-md border border-primary/30 bg-primary/5 p-4 text-sm", children: [(0, jsx_runtime_1.jsx)("p", { className: "font-semibold text-primary", children: "Evaluation in progress..." }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-muted-foreground", children: "Showing expected steps and assertions from decomposition. Results will appear as evaluation completes." })] })), (0, jsx_runtime_1.jsx)("div", { className: "space-y-4", children: requirementSteps.map(function (step, stepIndex) { return ((0, jsx_runtime_1.jsxs)("details", { className: "group rounded-md border bg-muted/40 text-sm text-foreground", children: [(0, jsx_runtime_1.jsxs)("summary", { className: "flex w-full cursor-pointer select-none items-center gap-2 px-3 py-3 text-left [&::-webkit-details-marker]:hidden", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: "size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" }), showLoadingState && ((0, jsx_runtime_1.jsx)(loadingDisplay.Icon, { "aria-label": loadingDisplay.label, className: (0, utils_1.cn)('size-4 shrink-0', loadingDisplay.iconClassName) })), (0, jsx_runtime_1.jsx)("span", { className: "truncate text-sm font-medium text-foreground", children: step.goal })] }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-3 border-t px-3 py-3 text-sm text-foreground", children: step.assertions && step.assertions.length > 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "space-y-2", children: step.assertions.map(function (assertion, assertionIndex) { return ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)('rounded-md border bg-background p-3', showLoadingState && 'opacity-75'), children: [(0, jsx_runtime_1.jsx)("div", { className: "text-sm font-medium text-foreground", children: assertion }), showLoadingState && ((0, jsx_runtime_1.jsx)("div", { className: "mt-2 text-xs text-muted-foreground italic", children: "Evidence will appear when evaluation completes" }))] }, "decomp-assertion-".concat(step.goal, "-").concat(stepIndex, "-").concat(assertionIndex))); }) })) : null })] }, "decomp-step-".concat(step.goal, "-").concat(stepIndex))); }) })] }));
}
