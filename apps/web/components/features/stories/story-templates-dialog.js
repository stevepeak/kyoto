"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoryTemplatesDialog = StoryTemplatesDialog;
var jsx_runtime_1 = require("react/jsx-runtime");
var dialog_1 = require("@/components/ui/dialog");
var story_templates_panel_1 = require("@/components/features/stories/story-templates-panel");
function StoryTemplatesDialog(_a) {
    var open = _a.open, onOpenChange = _a.onOpenChange, onSelectTemplate = _a.onSelectTemplate;
    return ((0, jsx_runtime_1.jsx)(dialog_1.Dialog, { open: open, onOpenChange: onOpenChange, children: (0, jsx_runtime_1.jsxs)(dialog_1.DialogContent, { className: "max-w-4xl max-h-[80vh] flex flex-col", children: [(0, jsx_runtime_1.jsxs)(dialog_1.DialogHeader, { children: [(0, jsx_runtime_1.jsx)(dialog_1.DialogTitle, { children: "Story Templates" }), (0, jsx_runtime_1.jsx)(dialog_1.DialogDescription, { children: "Choose a template to get started with your story. You can modify it after selecting." })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 overflow-auto min-h-0", children: (0, jsx_runtime_1.jsx)(story_templates_panel_1.StoryTemplatesPanel, { onSelectTemplate: function (template) {
                            onSelectTemplate(template.content);
                            onOpenChange(false);
                        } }) })] }) }));
}
