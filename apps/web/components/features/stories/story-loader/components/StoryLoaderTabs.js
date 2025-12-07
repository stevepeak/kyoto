'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.StoryLoaderTabs = StoryLoaderTabs
const lucide_react_1 = require('lucide-react')
const jsx_runtime_1 = require('react/jsx-runtime')

const story_decomposition_tab_1 = require('@/components/features/stories/story-decomposition-tab')
const story_edit_form_1 = require('@/components/features/stories/story-edit-form')
const story_runs_tab_1 = require('@/components/features/stories/story-runs-tab')
const tabs_1 = require('@/components/ui/tabs')

const StoryStateBanner_1 = require('./StoryStateBanner')
function StoryLoaderTabs(_a) {
  let _b
  const story = _a.story,
    storyName = _a.storyName,
    storyContent = _a.storyContent,
    hasChanges = _a.hasChanges,
    isSaving = _a.isSaving,
    isDecomposing = _a.isDecomposing,
    isTesting = _a.isTesting,
    isTogglingState = _a.isTogglingState,
    onNameChange = _a.onNameChange,
    onContentChange = _a.onContentChange,
    onSave = _a.onSave,
    onCancel = _a.onCancel,
    onArchive = _a.onArchive,
    onPause = _a.onPause,
    onDecompose = _a.onDecompose,
    onTest = _a.onTest,
    onToggleState = _a.onToggleState,
    onApproveGenerated = _a.onApproveGenerated
  return (0, jsx_runtime_1.jsxs)(tabs_1.Tabs, {
    defaultValue: 'story',
    className: 'flex flex-1 flex-col overflow-hidden',
    children: [
      (0, jsx_runtime_1.jsx)('div', {
        className: 'px-6 pt-6 pb-4 flex items-center justify-center',
        children: (0, jsx_runtime_1.jsxs)(tabs_1.TabsList, {
          className: 'h-auto p-2 w-full max-w-2xl',
          children: [
            (0, jsx_runtime_1.jsxs)(tabs_1.TabsTrigger, {
              value: 'story',
              className:
                'flex flex-col items-center gap-2 h-auto px-6 py-4 flex-1 data-[state=active]:bg-background',
              children: [
                (0, jsx_runtime_1.jsx)(lucide_react_1.FileText, {
                  className: 'h-6 w-6',
                }),
                (0, jsx_runtime_1.jsx)('span', {
                  className: 'text-base font-medium',
                  children: 'Story',
                }),
              ],
            }),
            (0, jsx_runtime_1.jsxs)(tabs_1.TabsTrigger, {
              value: 'decomposition',
              className:
                'flex flex-col items-center gap-2 h-auto px-6 py-4 flex-1 data-[state=active]:bg-background',
              children: [
                (0, jsx_runtime_1.jsx)(lucide_react_1.Layers, {
                  className: 'h-6 w-6',
                }),
                (0, jsx_runtime_1.jsx)('span', {
                  className: 'text-base font-medium',
                  children: 'Intent Composition',
                }),
              ],
            }),
            (0, jsx_runtime_1.jsxs)(tabs_1.TabsTrigger, {
              value: 'runs',
              className:
                'flex flex-col items-center gap-2 h-auto px-6 py-4 flex-1 data-[state=active]:bg-background',
              children: [
                (0, jsx_runtime_1.jsx)(lucide_react_1.History, {
                  className: 'h-6 w-6',
                }),
                (0, jsx_runtime_1.jsx)('span', {
                  className: 'text-base font-medium',
                  children: 'Recent Runs',
                }),
              ],
            }),
          ],
        }),
      }),
      (0, jsx_runtime_1.jsx)(StoryStateBanner_1.StoryStateBanner, {
        story,
        isTogglingState,
        isDecomposing,
        onToggleState,
        onApproveGenerated,
      }),
      (0, jsx_runtime_1.jsx)(tabs_1.TabsContent, {
        value: 'story',
        className: 'flex-1 overflow-auto mt-0',
        tabIndex: -1,
        children: (0, jsx_runtime_1.jsx)(story_edit_form_1.StoryEditForm, {
          storyName,
          storyContent,
          hasChanges,
          isSaving,
          storyState: story === null || story === void 0 ? void 0 : story.state,
          onNameChange,
          onContentChange,
          onSave,
          onCancel,
          onArchive,
          onPause,
        }),
      }),
      (0, jsx_runtime_1.jsx)(tabs_1.TabsContent, {
        value: 'decomposition',
        className: 'flex-1 overflow-hidden mt-0',
        tabIndex: -1,
        children: (0, jsx_runtime_1.jsx)(
          story_decomposition_tab_1.StoryDecompositionTab,
          {
            decomposition:
              (_b =
                story === null || story === void 0
                  ? void 0
                  : story.decomposition) !== null && _b !== void 0
                ? _b
                : null,
            isDecomposing,
            onDecompose,
          },
        ),
      }),
      (0, jsx_runtime_1.jsx)(tabs_1.TabsContent, {
        value: 'runs',
        className: 'flex-1 overflow-auto mt-0',
        tabIndex: -1,
        children: (0, jsx_runtime_1.jsx)(story_runs_tab_1.StoryRunsTab, {
          isTesting,
          onTest,
        }),
      }),
    ],
  })
}
