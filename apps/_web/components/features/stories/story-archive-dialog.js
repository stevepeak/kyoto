'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.StoryArchiveDialog = StoryArchiveDialog
const jsx_runtime_1 = require('react/jsx-runtime')

const button_1 = require('@/components/ui/button')
const dialog_1 = require('@/components/ui/dialog')
function StoryArchiveDialog(_a) {
  const open = _a.open,
    onOpenChange = _a.onOpenChange,
    isArchiving = _a.isArchiving,
    onArchive = _a.onArchive
  return (0, jsx_runtime_1.jsx)(dialog_1.Dialog, {
    open,
    onOpenChange,
    children: (0, jsx_runtime_1.jsxs)(dialog_1.DialogContent, {
      children: [
        (0, jsx_runtime_1.jsxs)(dialog_1.DialogHeader, {
          children: [
            (0, jsx_runtime_1.jsx)(dialog_1.DialogTitle, {
              children: 'Archive Story',
            }),
            (0, jsx_runtime_1.jsx)(dialog_1.DialogDescription, {
              children:
                'Are you sure you want to archive this story? The story will be hidden from the list but can be restored later.',
            }),
          ],
        }),
        (0, jsx_runtime_1.jsxs)(dialog_1.DialogFooter, {
          children: [
            (0, jsx_runtime_1.jsx)(button_1.Button, {
              variant: 'outline',
              onClick() {
                return onOpenChange(false)
              },
              disabled: isArchiving,
              children: 'Cancel',
            }),
            (0, jsx_runtime_1.jsx)(button_1.Button, {
              variant: 'destructive',
              onClick: onArchive,
              disabled: isArchiving,
              children: isArchiving ? 'Archiving...' : 'Archive',
            }),
          ],
        }),
      ],
    }),
  })
}
