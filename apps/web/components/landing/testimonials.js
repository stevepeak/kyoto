"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Testimonials = Testimonials;
var jsx_runtime_1 = require("react/jsx-runtime");
var content_1 = require("./content");
function Testimonials() {
    return ((0, jsx_runtime_1.jsx)("section", { className: "bg-linear-to-b from-muted/30 via-background to-background py-24 sm:py-28", children: (0, jsx_runtime_1.jsxs)("div", { className: "container", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mx-auto max-w-2xl text-center", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-semibold tracking-[0.3em] text-primary", title: "Okyakusama no monogatari \u2014 Customer stories", children: "\u304A\u5BA2\u69D8\u306E\u7269\u8A9E" }), (0, jsx_runtime_1.jsx)("h2", { className: "mt-4 font-display text-3xl text-foreground sm:text-4xl", children: "Example User Stories" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-4 text-base text-muted-foreground sm:text-lg", children: "Natural language tests can be written in any language or format. Here are some examples." })] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-16 grid gap-6 lg:grid-cols-3", children: content_1.stories.map(function (story) { return ((0, jsx_runtime_1.jsx)("figure", { className: "rounded-3xl border border-border/60 bg-card/70 p-8 shadow-lg transition hover:border-primary/30 hover:shadow-xl", children: (0, jsx_runtime_1.jsx)("blockquote", { className: "text-lg text-foreground", children: story.quote }) }, story.quote)); }) })] }) }));
}
