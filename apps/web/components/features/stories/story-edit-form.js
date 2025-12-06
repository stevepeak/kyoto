"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoryEditForm = StoryEditForm;
var jsx_runtime_1 = require("react/jsx-runtime");
var lucide_react_1 = require("lucide-react");
var button_1 = require("@/components/ui/button");
var input_1 = require("@/components/ui/input");
var tiptap_editor_1 = require("@/components/tiptap-editor");
var keyboard_shortcut_hint_1 = require("@/components/common/keyboard-shortcut-hint");
function StoryEditForm(_a) {
    var storyName = _a.storyName, storyContent = _a.storyContent, hasChanges = _a.hasChanges, isSaving = _a.isSaving, storyState = _a.storyState, onNameChange = _a.onNameChange, onContentChange = _a.onContentChange, onSave = _a.onSave, onCancel = _a.onCancel, onArchive = _a.onArchive, onPause = _a.onPause;
    var handleTitleChange = function (e) {
        onNameChange(e.target.value);
    };
    var handleTitleKeyDown = function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
        }
        if (e.key === 'Escape') {
            onNameChange(storyName);
            e.currentTarget.blur();
        }
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center min-h-full p-12", children: (0, jsx_runtime_1.jsxs)("div", { className: "w-full max-w-3xl", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-6", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-semibold tracking-[0.3em] text-primary mb-2", title: "Henshuu - to edit.", children: "\u3078\u3093\u3057\u3085\u3046" }), (0, jsx_runtime_1.jsx)(input_1.Input, { value: storyName || '', onChange: handleTitleChange, onKeyDown: handleTitleKeyDown, placeholder: "Untitled Story", disabled: isSaving, className: "text-2xl md:text-2xl font-display text-foreground h-auto py-2 px-0 border-0 border-none rounded-none focus-visible:ring-0 focus-visible:border-0 focus:border-0 focus:ring-0 bg-transparent shadow-none" })] }), (0, jsx_runtime_1.jsx)(tiptap_editor_1.TiptapEditor, { value: storyContent, onChange: onContentChange, className: "min-h-96 max-h-[600px]" }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-4 flex items-center justify-between pt-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-4", children: [storyState === 'active' && ((0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", onClick: onPause, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Pause, { className: "h-4 w-4" }) })), (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", onClick: onArchive, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Archive, { className: "h-4 w-4" }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [hasChanges && ((0, jsx_runtime_1.jsx)(button_1.Button, { variant: "outline", onClick: onCancel, disabled: isSaving, children: "Revert changes" })), (0, jsx_runtime_1.jsxs)(button_1.Button, { onClick: onSave, disabled: isSaving || !hasChanges, variant: !hasChanges ? 'outline' : 'default', children: [isSaving
                                            ? 'Saving...'
                                            : !hasChanges
                                                ? 'No changes made'
                                                : 'Save Changes', !isSaving && hasChanges && (0, jsx_runtime_1.jsx)(keyboard_shortcut_hint_1.KeyboardShortcutHint, {})] })] })] })] }) }));
}
