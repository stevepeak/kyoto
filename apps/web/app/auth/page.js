"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revalidate = exports.dynamic = void 0;
exports.default = AuthPage;
var jsx_runtime_1 = require("react/jsx-runtime");
var sign_in_1 = require("@/components/features/auth/sign-in");
// Auth page can be statically generated
exports.dynamic = 'force-static';
exports.revalidate = 3600; // Revalidate every hour
function AuthPage() {
    return (0, jsx_runtime_1.jsx)(sign_in_1.SignIn, {});
}
