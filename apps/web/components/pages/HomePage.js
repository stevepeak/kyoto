"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomePage = HomePage;
var jsx_runtime_1 = require("react/jsx-runtime");
var app_provider_1 = require("@/components/providers/app-provider");
var org_list_1 = require("@/components/features/orgs/org-list");
function HomePage() {
    return ((0, jsx_runtime_1.jsx)(app_provider_1.AppProvider, { children: (0, jsx_runtime_1.jsx)(org_list_1.OrgListApp, {}) }));
}
