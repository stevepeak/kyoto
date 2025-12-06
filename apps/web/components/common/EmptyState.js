"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyState = EmptyState;
var jsx_runtime_1 = require("react/jsx-runtime");
function EmptyState(_a) {
    var kanji = _a.kanji, kanjiTitle = _a.kanjiTitle, title = _a.title, description = _a.description, action = _a.action;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center justify-center px-4 py-16 text-center", children: [kanji ? ((0, jsx_runtime_1.jsx)("p", { className: "text-sm font-semibold tracking-[0.3em] text-primary mb-4", title: kanjiTitle, children: kanji })) : null, (0, jsx_runtime_1.jsx)("h2", { className: "text-2xl font-display text-foreground mb-3", children: title }), description ? ((0, jsx_runtime_1.jsx)("p", { className: "text-sm text-muted-foreground mb-8 max-w-md", children: description })) : null, action ? (0, jsx_runtime_1.jsx)("div", { children: action }) : null] }));
}
