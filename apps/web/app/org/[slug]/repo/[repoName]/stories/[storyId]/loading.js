"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StoryLoading;
var jsx_runtime_1 = require("react/jsx-runtime");
var loading_progress_1 = require("@/components/ui/loading-progress");
function StoryLoading() {
    return (0, jsx_runtime_1.jsx)(loading_progress_1.LoadingProgress, { label: "Loading story..." });
}
