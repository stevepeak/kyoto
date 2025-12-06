"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RunLoading;
var jsx_runtime_1 = require("react/jsx-runtime");
var loading_progress_1 = require("@/components/ui/loading-progress");
function RunLoading() {
    return (0, jsx_runtime_1.jsx)(loading_progress_1.LoadingProgress, { label: "Loading run..." });
}
