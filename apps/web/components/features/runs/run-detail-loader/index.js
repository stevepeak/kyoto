"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunDetailLoader = RunDetailLoader;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var layout_1 = require("@/components/layout");
var loading_progress_1 = require("@/components/ui/loading-progress");
var RunDetailContent_1 = require("./RunDetailContent");
function RunDetailLoader(_a) {
    var orgName = _a.orgName, repoName = _a.repoName, runId = _a.runId;
    return ((0, jsx_runtime_1.jsx)(react_1.Suspense, { fallback: (0, jsx_runtime_1.jsx)(layout_1.AppLayout, { breadcrumbs: [
                { label: orgName, href: "/org/".concat(orgName) },
                { label: repoName, href: "/org/".concat(orgName, "/repo/").concat(repoName) },
            ], children: (0, jsx_runtime_1.jsx)(loading_progress_1.LoadingProgress, { label: "Loading run..." }) }), children: (0, jsx_runtime_1.jsx)(RunDetailContent_1.RunDetailContent, { orgName: orgName, repoName: repoName, runId: runId }) }));
}
