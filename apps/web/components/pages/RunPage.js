"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunPage = RunPage;
var jsx_runtime_1 = require("react/jsx-runtime");
var run_detail_loader_1 = require("@/components/features/runs/run-detail-loader");
function RunPage(_a) {
    var orgName = _a.orgName, repoName = _a.repoName, runId = _a.runId;
    return (0, jsx_runtime_1.jsx)(run_detail_loader_1.RunDetailLoader, { orgName: orgName, repoName: repoName, runId: runId });
}
