'use client'
'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.StoryCard = StoryCard
const lucide_react_1 = require('lucide-react')
const jsx_runtime_1 = require('react/jsx-runtime')

const checkbox_1 = require('@/components/ui/checkbox')
const utils_1 = require('@/lib/utils')

const utils_2 = require('./utils')
function StoryCard(_a) {
  const _id = _a.id,
    name = _a.name,
    href = _a.href,
    groups = _a.groups,
    state = _a.state,
    _b = _a.isSelected,
    isSelected = _b === void 0 ? false : _b,
    _c = _a.isFocused,
    isFocused = _c === void 0 ? false : _c,
    onToggleSelection = _a.onToggleSelection
  // Check if story is being processed (title is missing or placeholder)
  const isProcessing = !name || name.trim() === '' || name.trim() === 'foobar'
  const displayName = isProcessing
    ? 'Newly crafted story is being processed...'
    : name
  const statePill = (0, utils_2.getStoryStatePillStyles)(state)
  const isGenerated = state === 'generated'
  const isPaused = state === 'paused'
  const handleCheckboxClick = function (e) {
    e.preventDefault()
    e.stopPropagation()
    onToggleSelection === null || onToggleSelection === void 0
      ? void 0
      : onToggleSelection()
  }
  const handleCardClick = function (e) {
    // If clicking on checkbox area, don't navigate
    if (e.target.closest('[role="checkbox"]')) {
      return
    }
    // Otherwise, allow navigation
  }
  return (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, {
    children: [
      isGenerated &&
        (0, jsx_runtime_1.jsx)('style', {
          children:
            '\n          @keyframes shimmer {\n            0% {\n              transform: translateX(-100%);\n            }\n            100% {\n              transform: translateX(100%);\n            }\n          }\n          .shimmer-effect {\n            animation: shimmer 3s infinite;\n          }\n        ',
        }),
      (0, jsx_runtime_1.jsxs)('div', {
        onClick: handleCardClick,
        className: (0, utils_1.cn)(
          'group flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted',
          isSelected && 'bg-muted',
          isFocused && 'bg-muted',
        ),
        children: [
          onToggleSelection &&
            (0, jsx_runtime_1.jsx)('div', {
              onClick: handleCheckboxClick,
              className: (0, utils_1.cn)(
                'flex-shrink-0 transition-opacity duration-150',
                // Show checkbox when: selected, hovered, or focused
                isSelected || isFocused
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100',
              ),
              children: (0, jsx_runtime_1.jsx)(checkbox_1.Checkbox, {
                checked: isSelected,
                onCheckedChange: onToggleSelection,
                onClick(e) {
                  return e.stopPropagation()
                },
              }),
            }),
          (0, jsx_runtime_1.jsxs)('a', {
            href,
            className: 'flex-1 flex flex-col gap-2 min-w-0',
            onClick(e) {
              // If clicking on checkbox, don't navigate
              if (e.target.closest('[role="checkbox"]')) {
                e.preventDefault()
              }
            },
            children: [
              (0, jsx_runtime_1.jsxs)('div', {
                className: 'flex items-center gap-2',
                children: [
                  (0, jsx_runtime_1.jsx)('span', {
                    className: (0, utils_1.cn)(
                      'font-medium line-clamp-1 flex-1',
                      isProcessing
                        ? 'text-muted-foreground italic'
                        : 'text-foreground',
                    ),
                    children: displayName,
                  }),
                  (0, jsx_runtime_1.jsxs)('span', {
                    className: (0, utils_1.cn)(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[10px] font-medium shrink-0',
                      statePill.className,
                      isGenerated &&
                        'border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 backdrop-blur-sm relative overflow-hidden',
                    ),
                    children: [
                      isGenerated &&
                        (0, jsx_runtime_1.jsx)('span', {
                          className:
                            'absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent shimmer-effect',
                        }),
                      isGenerated &&
                        (0, jsx_runtime_1.jsx)(lucide_react_1.Sparkles, {
                          className: 'h-3 w-3 relative z-10',
                        }),
                      isPaused &&
                        (0, jsx_runtime_1.jsx)(lucide_react_1.Pause, {
                          className: 'h-3 w-3',
                        }),
                      (0, jsx_runtime_1.jsx)('span', {
                        className: (0, utils_1.cn)(
                          isGenerated && 'relative z-10',
                        ),
                        children: statePill.label,
                      }),
                    ],
                  }),
                ],
              }),
              groups.length > 0 &&
                (0, jsx_runtime_1.jsx)('div', {
                  className: 'flex flex-wrap gap-1.5',
                  children: groups.map(function (group) {
                    return (0, jsx_runtime_1.jsx)(
                      'span',
                      {
                        className:
                          'inline-flex items-center rounded-full bg-primary/10 px-2 py-[3px] text-[10px] font-medium text-primary',
                        children: group,
                      },
                      group,
                    )
                  }),
                }),
            ],
          }),
        ],
      }),
    ],
  })
}
