"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunStoryCard = RunStoryCard;
var jsx_runtime_1 = require("react/jsx-runtime");
var card_1 = require("@/components/ui/card");
var RunStoryCardHeader_1 = require("./RunStoryCardHeader");
var RunStoryCardContent_1 = require("./RunStoryCardContent");
function RunStoryCard(_a) {
    var story = _a.story, testResult = _a.testResult, orgName = _a.orgName, repoName = _a.repoName, commitSha = _a.commitSha;
    return ((0, jsx_runtime_1.jsx)(card_1.Card, { className: "border bg-background", children: (0, jsx_runtime_1.jsxs)(card_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(RunStoryCardHeader_1.RunStoryCardHeader, { story: story, orgName: orgName, repoName: repoName }), (0, jsx_runtime_1.jsx)(RunStoryCardContent_1.RunStoryCardContent, { story: story, testResult: testResult, orgName: orgName, repoName: repoName, commitSha: commitSha })] }) }));
}
