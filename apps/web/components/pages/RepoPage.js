"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepoPage = RepoPage;
var jsx_runtime_1 = require("react/jsx-runtime");
var repo_overview_loader_1 = require("@/components/features/repos/repo-overview-loader");
function RepoPage(_a) {
    var orgName = _a.orgName, repoName = _a.repoName;
    return (0, jsx_runtime_1.jsx)(repo_overview_loader_1.RepoOverviewLoader, { orgName: orgName, repoName: repoName });
}
