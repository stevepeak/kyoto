'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.StoryCreateForm = StoryCreateForm
const lucide_react_1 = require('lucide-react')
const jsx_runtime_1 = require('react/jsx-runtime')

const keyboard_shortcut_hint_1 = require('@/components/common/keyboard-shortcut-hint')
const tiptap_editor_1 = require('@/components/tiptap-editor')
const button_1 = require('@/components/ui/button')
function StoryCreateForm(_a) {
  const storyContent = _a.storyContent,
    createMore = _a.createMore,
    isSaving = _a.isSaving,
    _b = _a.isGenerating,
    isGenerating = _b === void 0 ? false : _b,
    onContentChange = _a.onContentChange,
    onCreateMoreChange = _a.onCreateMoreChange,
    onSave = _a.onSave,
    onCancel = _a.onCancel,
    onTemplates = _a.onTemplates,
    onGenerate = _a.onGenerate
  return (0, jsx_runtime_1.jsx)('div', {
    className: 'flex items-center justify-center min-h-full p-12',
    children: (0, jsx_runtime_1.jsxs)('div', {
      className: 'w-full max-w-3xl',
      children: [
        (0, jsx_runtime_1.jsxs)('div', {
          className: 'mb-6',
          children: [
            (0, jsx_runtime_1.jsx)('p', {
              className:
                'text-sm font-semibold tracking-[0.3em] text-primary mb-2',
              title: 'Sakusei - to create.',
              children: '\u3055\u304F\u305B\u3044',
            }),
            (0, jsx_runtime_1.jsxs)('div', {
              className: 'flex items-center justify-between',
              children: [
                (0, jsx_runtime_1.jsx)('h1', {
                  className: 'text-2xl font-display text-foreground',
                  children: 'Craft new user story',
                }),
                (0, jsx_runtime_1.jsxs)(button_1.Button, {
                  variant: 'outline',
                  onClick: onGenerate,
                  disabled: isGenerating || isSaving || !onGenerate,
                  className:
                    'gap-2 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 hover:from-primary/20 hover:via-primary/10 hover:to-primary/20 hover:border-primary/50 transition-all shadow-sm hover:shadow-md backdrop-blur-sm relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed',
                  children: [
                    (0, jsx_runtime_1.jsx)('span', {
                      className:
                        'absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent shimmer-effect',
                    }),
                    (0, jsx_runtime_1.jsx)(lucide_react_1.Sparkles, {
                      className: 'h-4 w-4 text-primary relative z-10',
                    }),
                    (0, jsx_runtime_1.jsx)('span', {
                      className: 'relative z-10',
                      children: isGenerating ? 'Generating...' : 'Generate',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        (0, jsx_runtime_1.jsx)(tiptap_editor_1.TiptapEditor, {
          value: storyContent,
          onChange: onContentChange,
          className: 'min-h-96 max-h-[600px]',
          autoFocus: true,
          readOnly: isGenerating,
        }),
        (0, jsx_runtime_1.jsxs)('div', {
          className: 'mt-4 flex items-center justify-between pt-4',
          children: [
            (0, jsx_runtime_1.jsx)('div', {
              className: 'flex items-center gap-4',
              children: (0, jsx_runtime_1.jsxs)('label', {
                className:
                  'flex items-center gap-2 text-sm text-muted-foreground cursor-pointer',
                children: [
                  (0, jsx_runtime_1.jsx)('input', {
                    type: 'checkbox',
                    checked: createMore,
                    onChange(e) {
                      return onCreateMoreChange(e.target.checked)
                    },
                    disabled: isGenerating || isSaving,
                    className:
                      'h-4 w-4 rounded border-input disabled:opacity-50 disabled:cursor-not-allowed',
                  }),
                  'Create more',
                ],
              }),
            }),
            (0, jsx_runtime_1.jsxs)('div', {
              className: 'flex gap-2',
              children: [
                (0, jsx_runtime_1.jsxs)(button_1.Button, {
                  variant: 'ghost',
                  onClick: onTemplates,
                  disabled: isGenerating || isSaving,
                  children: [
                    (0, jsx_runtime_1.jsx)(lucide_react_1.FileText, {
                      className: 'h-4 w-4 mr-2',
                    }),
                    'Templates',
                  ],
                }),
                (0, jsx_runtime_1.jsx)(button_1.Button, {
                  variant: 'outline',
                  onClick: onCancel,
                  disabled: isGenerating || isSaving,
                  children: 'Cancel',
                }),
                (0, jsx_runtime_1.jsxs)(button_1.Button, {
                  onClick: onSave,
                  disabled: isGenerating || isSaving,
                  children: [
                    isSaving ? 'Saving...' : 'Create',
                    !isSaving &&
                      (0, jsx_runtime_1.jsx)(
                        keyboard_shortcut_hint_1.KeyboardShortcutHint,
                        {},
                      ),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  })
}
