"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunDetailHeader = RunDetailHeader;
var jsx_runtime_1 = require("react/jsx-runtime");
var RunDetailTitle_1 = require("./RunDetailTitle");
var RunDetailCommitBlock_1 = require("./RunDetailCommitBlock");
function RunDetailHeader(_a) {
    var commitTitle = _a.commitTitle, runStatusDescriptor = _a.runStatusDescriptor, relativeStarted = _a.relativeStarted, absoluteStarted = _a.absoluteStarted, durationDisplay = _a.durationDisplay, statusDisplay = _a.statusDisplay, run = _a.run, shortSha = _a.shortSha, commitUrl = _a.commitUrl, pullRequestUrl = _a.pullRequestUrl, orgName = _a.orgName, repoName = _a.repoName;
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(RunDetailTitle_1.RunDetailTitle, { commitTitle: commitTitle, runStatusDescriptor: runStatusDescriptor, relativeStarted: relativeStarted, absoluteStarted: absoluteStarted, durationDisplay: durationDisplay, statusDisplay: statusDisplay, run: run, shortSha: shortSha, commitUrl: commitUrl, orgName: orgName, repoName: repoName }), (0, jsx_runtime_1.jsx)(RunDetailCommitBlock_1.RunDetailCommitBlock, { run: run, pullRequestUrl: pullRequestUrl })] }));
}
