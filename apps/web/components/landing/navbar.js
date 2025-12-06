'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LandingNavbar = LandingNavbar;
var jsx_runtime_1 = require("react/jsx-runtime");
var navigation_1 = require("next/navigation");
var auth_client_1 = require("@/client/auth-client");
var github_sign_in_button_1 = require("@/components/features/auth/github-sign-in-button");
var button_1 = require("@/components/ui/button");
function LandingNavbar() {
    var _a;
    var session = (0, auth_client_1.useSession)();
    var router = (0, navigation_1.useRouter)();
    var isLoggedIn = ((_a = session.data) === null || _a === void 0 ? void 0 : _a.user) && !session.isPending;
    var handleEnterKyoto = function () {
        router.push('/app');
    };
    return ((0, jsx_runtime_1.jsx)("header", { className: "relative z-20 border-b border-border/60 bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60", children: (0, jsx_runtime_1.jsxs)("div", { className: "container flex flex-col items-center gap-3 py-4 sm:flex-row sm:items-center sm:justify-between", children: [(0, jsx_runtime_1.jsxs)("a", { href: "/", className: "inline-flex items-center gap-2 text-lg font-semibold text-foreground", children: [(0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", className: "text-xl", children: "\u26E9\uFE0F" }), (0, jsx_runtime_1.jsx)("span", { className: "font-display", children: "Kyoto" })] }), (0, jsx_runtime_1.jsxs)("nav", { className: "flex flex-wrap items-center justify-center gap-3 sm:gap-5 md:gap-8 text-sm font-medium text-muted-foreground", children: [(0, jsx_runtime_1.jsx)("a", { href: "/#product", className: "transition-colors hover:text-foreground focus-visible:text-foreground", children: "Product" }), (0, jsx_runtime_1.jsx)("a", { href: "#/pricing", className: "transition-colors hover:text-foreground focus-visible:text-foreground", children: "Pricing" }), (0, jsx_runtime_1.jsx)("a", { href: "/about", className: "transition-colors hover:text-foreground focus-visible:text-foreground", children: "About" })] }), (0, jsx_runtime_1.jsx)("div", { className: "w-full sm:w-auto", children: isLoggedIn ? ((0, jsx_runtime_1.jsx)(button_1.Button, { size: "sm", onClick: handleEnterKyoto, className: "w-full sm:w-auto gap-2", children: "Enter Kyoto" })) : ((0, jsx_runtime_1.jsx)(github_sign_in_button_1.GitHubSignInButton, { size: "sm", className: "w-full sm:w-auto gap-2" })) })] }) }));
}
