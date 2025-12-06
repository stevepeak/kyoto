'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoryLoaderClient = StoryLoaderClient;
var jsx_runtime_1 = require("react/jsx-runtime");
var layout_1 = require("@/components/layout");
var story_archive_dialog_1 = require("@/components/features/stories/story-archive-dialog");
var story_templates_dialog_1 = require("@/components/features/stories/story-templates-dialog");
var story_create_form_1 = require("@/components/features/stories/story-create-form");
var react_hotkeys_hook_1 = require("react-hotkeys-hook");
var useStoryLoaderState_1 = require("./hooks/useStoryLoaderState");
var useStoryActions_1 = require("./hooks/useStoryActions");
var useStoryGeneration_1 = require("./hooks/useStoryGeneration");
var StoryLoaderTabs_1 = require("./components/StoryLoaderTabs");
var StoryGenerationTracking_1 = require("./components/StoryGenerationTracking");
function StoryLoaderClient(_a) {
    var orgName = _a.orgName, repoName = _a.repoName, storyId = _a.storyId, initialStory = _a.initialStory;
    var isCreateMode = !storyId;
    // State management
    var state = (0, useStoryLoaderState_1.useStoryLoaderState)({ initialStory: initialStory });
    // Actions
    var actions = (0, useStoryActions_1.useStoryActions)({
        orgName: orgName,
        repoName: repoName,
        storyId: storyId,
        isCreateMode: isCreateMode,
        storyName: state.storyName,
        storyContent: state.storyContent,
        originalStoryContent: state.originalStoryContent,
        originalStoryName: state.originalStoryName,
        hasContentChanges: state.hasContentChanges,
        hasNameChanges: state.hasNameChanges,
        createMore: state.createMore,
        setStory: state.setStory,
        setStoryName: state.setStoryName,
        setStoryContent: state.setStoryContent,
        setOriginalStoryContent: state.setOriginalStoryContent,
        setOriginalStoryName: state.setOriginalStoryName,
        setCreateMore: state.setCreateMore,
        setError: state.setError,
        setIsSaving: state.setIsSaving,
        setIsArchiving: state.setIsArchiving,
        setIsTogglingState: state.setIsTogglingState,
        setIsDecomposing: state.setIsDecomposing,
        setIsTesting: state.setIsTesting,
        setIsGenerating: state.setIsGenerating,
        setGenerationRunId: state.setGenerationRunId,
        setGenerationAccessToken: state.setGenerationAccessToken,
    });
    // Generation logic
    var generation = (0, useStoryGeneration_1.useStoryGeneration)({
        setIsGenerating: state.setIsGenerating,
        setGenerationRunId: state.setGenerationRunId,
        setGenerationAccessToken: state.setGenerationAccessToken,
        setStoryContent: state.setStoryContent,
        setStoryName: state.setStoryName,
        setError: state.setError,
    });
    // Keyboard shortcuts
    // Handle Cmd/Ctrl+Enter for save
    (0, react_hotkeys_hook_1.useHotkeys)('mod+enter', function (event) {
        // Prevent default to stop TipTap from inserting newline
        event.preventDefault();
        event.stopPropagation();
        if (!state.isSaving && (isCreateMode || state.hasChanges)) {
            void actions.handleSave();
        }
    }, {
        preventDefault: true,
        enableOnFormTags: true,
        enableOnContentEditable: true,
    });
    var breadcrumbs = [
        { label: orgName, href: "/org/".concat(orgName) },
        { label: repoName, href: "/org/".concat(orgName, "/repo/").concat(repoName) },
    ];
    return ((0, jsx_runtime_1.jsxs)(layout_1.AppLayout, { breadcrumbs: breadcrumbs, children: [(0, jsx_runtime_1.jsx)("style", { children: "\n        @keyframes shimmer {\n          0% {\n            transform: translateX(-100%);\n          }\n          100% {\n            transform: translateX(100%);\n          }\n        }\n        .shimmer-effect {\n          animation: shimmer 3s infinite;\n        }\n      " }), state.error && ((0, jsx_runtime_1.jsx)("div", { className: "mx-6 mt-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md", children: state.error })), isCreateMode || state.story ? ((0, jsx_runtime_1.jsx)("div", { className: "flex flex-col h-full overflow-hidden", children: (0, jsx_runtime_1.jsx)("div", { className: "flex flex-1 overflow-hidden flex-col", children: !isCreateMode ? ((0, jsx_runtime_1.jsx)(StoryLoaderTabs_1.StoryLoaderTabs, { story: state.story, storyName: state.storyName, storyContent: state.storyContent, hasChanges: state.hasChanges, isSaving: state.isSaving, isDecomposing: state.isDecomposing, isTesting: state.isTesting, isTogglingState: state.isTogglingState, onNameChange: state.setStoryName, onContentChange: state.setStoryContent, onSave: actions.handleSave, onCancel: actions.handleCancel, onArchive: function () { return state.setShowArchiveDialog(true); }, onPause: function () { return actions.handleToggleState('paused'); }, onDecompose: actions.handleDecompose, onTest: actions.handleTest, onToggleState: actions.handleToggleState, onApproveGenerated: actions.handleApproveGenerated })) : ((0, jsx_runtime_1.jsx)(story_create_form_1.StoryCreateForm, { storyContent: state.storyContent, createMore: state.createMore, isSaving: state.isSaving, isGenerating: state.isGenerating, onContentChange: state.setStoryContent, onCreateMoreChange: state.setCreateMore, onSave: actions.handleSave, onCancel: actions.handleCancel, onTemplates: function () { return state.setShowTemplatesDialog(true); }, onGenerate: actions.handleGenerate })) }) })) : null, (0, jsx_runtime_1.jsx)(story_templates_dialog_1.StoryTemplatesDialog, { open: state.showTemplatesDialog, onOpenChange: state.setShowTemplatesDialog, onSelectTemplate: function (content) {
                    state.setStoryContent(content);
                } }), (0, jsx_runtime_1.jsx)(story_archive_dialog_1.StoryArchiveDialog, { open: state.showArchiveDialog, onOpenChange: state.setShowArchiveDialog, isArchiving: state.isArchiving, onArchive: actions.handleArchive }), (0, jsx_runtime_1.jsx)(StoryGenerationTracking_1.StoryGenerationTracking, { runId: state.generationRunId, publicAccessToken: state.generationAccessToken, onComplete: generation.handleGenerationComplete, onError: function (error) {
                    state.setError(error instanceof Error ? error.message : String(error));
                    state.setIsGenerating(false);
                    state.setGenerationRunId(null);
                    state.setGenerationAccessToken(null);
                } })] }));
}
