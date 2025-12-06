"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunDetailCommitBlock = RunDetailCommitBlock;
var jsx_runtime_1 = require("react/jsx-runtime");
function RunDetailCommitBlock(_a) {
    var run = _a.run, pullRequestUrl = _a.pullRequestUrl;
    return ((0, jsx_runtime_1.jsx)("div", { className: "space-y-4", children: (0, jsx_runtime_1.jsx)("div", { className: "grid gap-4 text-sm sm:grid-cols-2", children: run.prNumber ? ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-1", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-muted-foreground", children: "Pull request" }), (0, jsx_runtime_1.jsx)("div", { className: "text-foreground font-medium", children: pullRequestUrl ? ((0, jsx_runtime_1.jsxs)("a", { href: pullRequestUrl, target: "_blank", rel: "noreferrer", className: "text-primary hover:text-primary/80", children: ["#", run.prNumber] })) : ("#".concat(run.prNumber)) })] })) : null }) }));
}
