"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoryCreatePage = StoryCreatePage;
var jsx_runtime_1 = require("react/jsx-runtime");
var story_loader_1 = require("./story-loader");
function StoryCreatePage(_a) {
    var orgName = _a.orgName, repoName = _a.repoName;
    return (0, jsx_runtime_1.jsx)(story_loader_1.StoryLoader, { orgName: orgName, repoName: repoName });
}
