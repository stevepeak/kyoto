"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppLayout = AppLayout;
var jsx_runtime_1 = require("react/jsx-runtime");
var top_nav_1 = require("./top-nav");
var app_footer_1 = require("./app-footer");
function AppLayout(_a) {
    var children = _a.children, breadcrumbs = _a.breadcrumbs, right = _a.right;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "min-h-screen w-full flex flex-col bg-background", children: [(0, jsx_runtime_1.jsx)(top_nav_1.TopNav, { breadcrumbs: breadcrumbs, right: right }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1", children: children }), (0, jsx_runtime_1.jsx)(app_footer_1.AppFooter, {})] }));
}
