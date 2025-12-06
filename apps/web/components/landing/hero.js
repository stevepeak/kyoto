'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LandingHero = LandingHero;
var jsx_runtime_1 = require("react/jsx-runtime");
var image_1 = require("next/image");
var lucide_react_1 = require("lucide-react");
var github_sign_in_button_1 = require("@/components/features/auth/github-sign-in-button");
function LandingHero() {
    return ((0, jsx_runtime_1.jsxs)("section", { className: "relative min-h-[90vh] overflow-hidden pt-8 pb-20 sm:pt-10 sm:pb-24 lg:pt-12 lg:pb-32", children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0", children: (0, jsx_runtime_1.jsx)(image_1.default, { src: "/kyoto.png", alt: "", fill: true, className: "object-cover object-left-bottom", priority: true, sizes: "100vw" }) }), (0, jsx_runtime_1.jsx)("div", { className: "container relative z-10 flex flex-col gap-12 px-6 pt-4 pb-12 lg:flex-row lg:items-center lg:justify-between lg:pb-16", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-xl space-y-8", children: [(0, jsx_runtime_1.jsx)("span", { className: "inline-flex items-center gap-2 rounded-full bg-background/70 px-4 py-1 text-sm font-medium text-muted-foreground", children: "\uD83D\uDC4B Meet Kyoto, from the creators of Codecov" }), (0, jsx_runtime_1.jsx)("h1", { className: "font-display text-4xl tracking-tight text-foreground sm:text-5xl lg:text-6xl", children: "Ship it working." }), (0, jsx_runtime_1.jsxs)("p", { className: "max-w-prose text-lg text-muted-foreground sm:text-xl", children: ["Kyoto is first ", (0, jsx_runtime_1.jsx)("b", { children: "intent testing" }), " platform using AI agents that evaluate user stories by tracing code execution paths so you can prevent regressions and ship with confidence."] }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-col gap-3 sm:flex-row", children: (0, jsx_runtime_1.jsxs)(github_sign_in_button_1.GitHubSignInButton, { size: "lg", className: "gap-2", children: ["Get started", (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { className: "size-4" })] }) })] }) })] }));
}
