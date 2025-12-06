"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.default = AppPage;
var jsx_runtime_1 = require("react/jsx-runtime");
var HomePage_1 = require("@/components/pages/HomePage");
// App home page is user-specific and always dynamic
exports.dynamic = 'force-dynamic';
function AppPage() {
    return (0, jsx_runtime_1.jsx)(HomePage_1.HomePage, {});
}
