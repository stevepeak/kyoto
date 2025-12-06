'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GlobalError;
var jsx_runtime_1 = require("react/jsx-runtime");
var Sentry = require("@sentry/nextjs");
var react_1 = require("react");
var button_1 = require("@/components/ui/button");
function GlobalError(_a) {
    var error = _a.error, reset = _a.reset;
    (0, react_1.useEffect)(function () {
        // Send error to Sentry with full traceback
        Sentry.captureException(error, {
            tags: {
                globalErrorBoundary: true,
                digest: error.digest,
            },
        });
    }, [error]);
    return ((0, jsx_runtime_1.jsx)("html", { children: (0, jsx_runtime_1.jsx)("body", { children: (0, jsx_runtime_1.jsx)("div", { className: "flex min-h-screen flex-col items-center justify-center gap-4 p-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "text-center space-y-4", children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-semibold text-foreground", children: "Something went wrong!" }), (0, jsx_runtime_1.jsx)("p", { className: "text-muted-foreground", children: error.message || 'An unexpected error occurred' }), error.digest && ((0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-muted-foreground", children: ["Error ID: ", error.digest] })), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2 justify-center", children: [(0, jsx_runtime_1.jsx)(button_1.Button, { onClick: reset, variant: "default", children: "Try again" }), (0, jsx_runtime_1.jsx)(button_1.Button, { onClick: function () { return (window.location.href = '/'); }, variant: "outline", children: "Go home" })] })] }) }) }) }));
}
