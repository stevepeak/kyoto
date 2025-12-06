'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Faq = Faq;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var content_1 = require("./content");
function Faq() {
    var _a, _b;
    var _c = (0, react_1.useState)((_b = (_a = content_1.faqs[0]) === null || _a === void 0 ? void 0 : _a.question) !== null && _b !== void 0 ? _b : null), openItem = _c[0], setOpenItem = _c[1];
    return ((0, jsx_runtime_1.jsx)("section", { className: "bg-linear-to-b from-background via-muted/20 to-background py-24 sm:py-28", children: (0, jsx_runtime_1.jsxs)("div", { className: "container", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mx-auto max-w-2xl text-center", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-semibold tracking-[0.3em] text-primary", title: "Yoku aru shitsumon \u2014 Frequently asked questions", children: "\u3088\u304F\u3042\u308B\u8CEA\u554F" }), (0, jsx_runtime_1.jsx)("h2", { className: "mt-4 font-display text-3xl text-foreground sm:text-4xl", children: "Frequently Asked Questions" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-4 text-base text-muted-foreground sm:text-lg", children: ["Have more questions? Reach our solutions team any time at", ' ', (0, jsx_runtime_1.jsx)("a", { className: "text-primary underline underline-offset-4", href: "mailto:hello@usekyoto.com", children: "hello@usekyoto.com" }), "."] })] }), (0, jsx_runtime_1.jsx)("div", { className: "mx-auto mt-12 max-w-3xl divide-y divide-border overflow-hidden rounded-3xl border border-border/60 bg-card/70 shadow-lg", children: content_1.faqs.map(function (item) {
                        var isOpen = openItem === item.question;
                        return ((0, jsx_runtime_1.jsx)("button", { type: "button", className: "w-full text-left", onClick: function () { return setOpenItem(isOpen ? null : item.question); }, children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-4 px-6 py-6 sm:px-8 sm:py-8", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-lg font-semibold text-foreground", children: item.question }), isOpen ? ((0, jsx_runtime_1.jsx)("p", { className: "mt-3 text-sm text-muted-foreground", children: item.answer })) : null] }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: "mt-1 size-5 text-muted-foreground transition-transform ".concat(isOpen ? 'rotate-180' : '') })] }) }, item.question));
                    }) })] }) }));
}
