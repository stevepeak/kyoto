"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetupPageWrapper = SetupPageWrapper;
var jsx_runtime_1 = require("react/jsx-runtime");
var app_provider_1 = require("@/components/providers/app-provider");
var SetupPage_1 = require("./SetupPage");
function SetupPageWrapper(_a) {
    var installationId = _a.installationId;
    return ((0, jsx_runtime_1.jsx)(app_provider_1.AppProvider, { children: (0, jsx_runtime_1.jsx)(SetupPage_1.SetupPage, { installationId: installationId }) }));
}
