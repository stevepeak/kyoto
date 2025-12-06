"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoryPage = StoryPage;
var jsx_runtime_1 = require("react/jsx-runtime");
var story_loader_1 = require("./story-loader");
function StoryPage(_a) {
    var orgName = _a.orgName, repoName = _a.repoName, storyId = _a.storyId;
    return (0, jsx_runtime_1.jsx)(story_loader_1.StoryLoader, { orgName: orgName, repoName: repoName, storyId: storyId });
}
