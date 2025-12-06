"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoryDecompositionTab = StoryDecompositionTab;
var jsx_runtime_1 = require("react/jsx-runtime");
var lucide_react_1 = require("lucide-react");
var button_1 = require("@/components/ui/button");
var EmptyState_1 = require("@/components/common/EmptyState");
function StoryDecompositionTab(_a) {
    var decomposition = _a.decomposition, isDecomposing = _a.isDecomposing, onDecompose = _a.onDecompose;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex h-full", children: [(0, jsx_runtime_1.jsxs)("div", { className: "w-1/2 p-6 overflow-auto border-r", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between mb-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-semibold tracking-[0.3em] text-primary mb-2", title: "Bunkai - to break down.", children: "\u3076\u3093\u304B\u3044" }), (0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-display text-foreground", children: "Intent Composition" })] }), (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "outline", onClick: onDecompose, disabled: isDecomposing, children: isDecomposing ? 'Transcribing...' : 'Re-transcribe' })] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-3", children: decomposition ? ((0, jsx_runtime_1.jsx)("pre", { className: "text-xs bg-muted p-4 rounded-md overflow-auto", children: JSON.stringify(decomposition, null, 2) })) : ((0, jsx_runtime_1.jsx)("div", { className: "text-sm text-muted-foreground", children: "No decomposition data available." })) })] }), (0, jsx_runtime_1.jsx)("div", { className: "w-1/2 p-6 overflow-auto", children: (0, jsx_runtime_1.jsx)(EmptyState_1.EmptyState, { kanji: "\u3052\u3093\u307D\u3093", kanjiTitle: "Genpon - original source.", title: "Backed by source", description: "View the source code and implementation details that back this intent composition. See how your stories are translated into actual code changes and understand the connection between intent and implementation.", action: (0, jsx_runtime_1.jsxs)(button_1.Button, { size: "lg", variant: "outline", onClick: function () {
                            window.alert('Coming soon');
                        }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Play, { className: "h-4 w-4" }), "Run intent test"] }) }) })] }));
}
