"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTiptapEditor = useTiptapEditor;
var react_1 = require("@tiptap/react");
var react_2 = require("react");
var editorExtensions_1 = require("../utils/editorExtensions");
var utils_1 = require("@/lib/utils");
function useTiptapEditor(_a) {
    var value = _a.value, onChange = _a.onChange, readOnly = _a.readOnly, placeholder = _a.placeholder;
    // Only render editor after hydration to prevent mismatches
    var _b = (0, react_2.useState)(false), mounted = _b[0], setMounted = _b[1];
    (0, react_2.useEffect)(function () {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Client-side mounting pattern for Next.js
        setMounted(true);
    }, []);
    var extensions = (0, react_2.useMemo)(function () { return (0, editorExtensions_1.createEditorExtensions)(readOnly, placeholder); }, [readOnly, placeholder]);
    var editor = (0, react_1.useEditor)({
        extensions: extensions,
        content: value || '',
        contentType: 'markdown',
        editable: !readOnly,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: (0, utils_1.cn)('prose prose-sm max-w-none focus:outline-none min-h-[200px] font-sans', 'prose-headings:font-semibold prose-headings:text-foreground prose-headings:font-sans', 'prose-p:text-foreground prose-p:my-2 prose-p:font-sans', 'prose-ul:text-foreground prose-ul:my-2 prose-ul:font-sans', 'prose-ol:text-foreground prose-ol:my-2 prose-ol:font-sans', 'prose-li:text-foreground prose-li:my-1 prose-li:font-sans', 'prose-strong:text-foreground prose-strong:font-semibold prose-strong:font-sans', 'prose-code:text-foreground prose-code:text-sm prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:font-sans', 'prose-pre:text-foreground prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-md prose-pre:font-sans', 'prose-blockquote:text-foreground prose-blockquote:border-l-4 prose-blockquote:border-muted-foreground prose-blockquote:pl-4 prose-blockquote:font-sans', 'prose-a:text-primary prose-a:underline prose-a:font-sans'),
            },
            handleKeyDown: function (view, event) {
                // Prevent Cmd+Enter or Ctrl+Enter from inserting a newline
                // Let the parent component handle the save action
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    return true; // Return true to prevent default behavior
                }
                return false; // Let other keys work normally
            },
        },
        onUpdate: function (_a) {
            var editor = _a.editor;
            // Save as markdown
            var markdown = editor.getMarkdown();
            onChange(markdown);
        },
    });
    // Update editor content when value prop changes (e.g., when loading from server)
    (0, react_2.useEffect)(function () {
        if (!editor) {
            return;
        }
        var currentContent = editor.getMarkdown();
        // Only update if content actually changed
        if (value !== currentContent) {
            editor.commands.setContent(value || '', { contentType: 'markdown' });
        }
    }, [value, editor]);
    // Update editable state when readOnly changes
    (0, react_2.useEffect)(function () {
        if (editor) {
            editor.setEditable(!readOnly);
        }
    }, [editor, readOnly]);
    return { editor: editor, mounted: mounted };
}
