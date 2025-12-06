'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TiptapEditor = TiptapEditor;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("@tiptap/react");
var useTiptapEditor_1 = require("./hooks/useTiptapEditor");
var useTiptapAutoFocus_1 = require("./hooks/useTiptapAutoFocus");
var utils_1 = require("@/lib/utils");
function TiptapEditor(_a) {
    var value = _a.value, onChange = _a.onChange, _b = _a.readOnly, readOnly = _b === void 0 ? false : _b, placeholder = _a.placeholder, className = _a.className, _c = _a.autoFocus, autoFocus = _c === void 0 ? false : _c;
    var _d = (0, useTiptapEditor_1.useTiptapEditor)({
        value: value,
        onChange: onChange,
        readOnly: readOnly,
        placeholder: placeholder,
    }), editor = _d.editor, mounted = _d.mounted;
    (0, useTiptapAutoFocus_1.useTiptapAutoFocus)({
        editor: editor,
        autoFocus: autoFocus,
        readOnly: readOnly,
    });
    // Show loading state until mounted and editor is ready
    if (!mounted || !editor) {
        return ((0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)('w-full h-96 rounded-md border border-input bg-white p-4 text-sm text-card-foreground shadow-sm', 'flex items-center justify-center text-muted-foreground', className), children: "Loading editor..." }));
    }
    if (readOnly) {
        return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("style", { children: "\n          .tiptap p.is-editor-empty:first-child::before {\n            content: attr(data-placeholder);\n            float: left;\n            color: hsl(var(--muted-foreground));\n            pointer-events: none;\n            height: 0;\n          }\n          .tiptap * {\n            font-family: var(--font-sans) !important;\n          }\n        " }), (0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)('w-full rounded-md border border-input bg-white p-4 text-sm text-card-foreground shadow-sm overflow-auto', className), children: (0, jsx_runtime_1.jsx)(react_1.EditorContent, { editor: editor }) })] }));
    }
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("style", { children: "\n        .tiptap p.is-editor-empty:first-child::before {\n          content: attr(data-placeholder);\n          float: left;\n          color: hsl(var(--muted-foreground));\n          pointer-events: none;\n          height: 0;\n        }\n        .tiptap * {\n          font-family: var(--font-sans) !important;\n        }\n      " }), (0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)('w-full rounded-md border border-input bg-white shadow-sm flex flex-col', className), children: (0, jsx_runtime_1.jsx)("div", { className: "p-4 text-sm text-card-foreground overflow-auto flex-1 min-h-0", children: (0, jsx_runtime_1.jsx)(react_1.EditorContent, { editor: editor }) }) })] }));
}
