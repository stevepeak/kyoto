'use client'
'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.OrgRepoDashboard = OrgRepoDashboard
const lucide_react_1 = require('lucide-react')
const react_1 = require('react')
const react_hotkeys_hook_1 = require('react-hotkeys-hook')
const si_1 = require('react-icons/si')
const jsx_runtime_1 = require('react/jsx-runtime')

const layout_1 = require('@/components/layout')
const button_1 = require('@/components/ui/button')

const ConnectRepoDialog_1 = require('./ConnectRepoDialog')
const RepoList_1 = require('./RepoList')
function OrgRepoDashboard(_a) {
  let _b
  const org = _a.org,
    repos = _a.repos
  const _c = (0, react_1.useState)(false),
    isDialogOpen = _c[0],
    setIsDialogOpen = _c[1]
  const handleOpenDialog = (0, react_1.useCallback)(function () {
    setIsDialogOpen(true)
  }, [])
  ;(0, react_hotkeys_hook_1.useHotkeys)(
    'mod+enter',
    function () {
      handleOpenDialog()
    },
    { enabled: repos.length === 0 && !isDialogOpen, preventDefault: true },
  )
  return (0, jsx_runtime_1.jsxs)(layout_1.AppLayout, {
    breadcrumbs: org
      ? [
          {
            label: org.slug,
            href: '/org/'.concat(org.slug),
          },
        ]
      : undefined,
    children: [
      (0, jsx_runtime_1.jsxs)('div', {
        className: 'flex h-full flex-col overflow-hidden',
        children: [
          (0, jsx_runtime_1.jsx)('div', {
            className:
              'border-b border-border bg-background/80 px-6 py-6 backdrop-blur supports-[backdrop-filter]:bg-background/60',
            children: (0, jsx_runtime_1.jsxs)('div', {
              className: 'flex flex-wrap items-center justify-between gap-4',
              children: [
                (0, jsx_runtime_1.jsxs)('div', {
                  className: 'flex flex-col gap-2',
                  children: [
                    (0, jsx_runtime_1.jsx)('div', {
                      className: 'text-xl font-semibold text-foreground',
                      children:
                        (_b =
                          org === null || org === void 0
                            ? void 0
                            : org.name) !== null && _b !== void 0
                          ? _b
                          : 'Organization',
                    }),
                    (0, jsx_runtime_1.jsx)('div', {
                      className:
                        'flex flex-wrap items-center gap-3 text-sm text-muted-foreground',
                      children: (
                        org === null || org === void 0 ? void 0 : org.slug
                      )
                        ? (0, jsx_runtime_1.jsxs)('a', {
                            href: 'https://github.com/'.concat(org.slug),
                            target: '_blank',
                            rel: 'noopener noreferrer',
                            className:
                              'flex items-center gap-2 hover:text-foreground transition-colors',
                            children: [
                              (0, jsx_runtime_1.jsx)(si_1.SiGithub, {
                                className: 'h-4 w-4 text-muted-foreground',
                              }),
                              (0, jsx_runtime_1.jsx)('span', {
                                children: org.slug,
                              }),
                            ],
                          })
                        : null,
                    }),
                  ],
                }),
                repos.length > 0 &&
                  (0, jsx_runtime_1.jsxs)(button_1.Button, {
                    onClick: handleOpenDialog,
                    className: 'gap-2',
                    children: [
                      (0, jsx_runtime_1.jsx)(lucide_react_1.Plus, {
                        className: 'h-5 w-5',
                      }),
                      (0, jsx_runtime_1.jsx)('span', {
                        children: 'Add Repository',
                      }),
                    ],
                  }),
              ],
            }),
          }),
          (0, jsx_runtime_1.jsx)('div', {
            className: 'flex-1 overflow-auto px-6 py-6',
            children: (0, jsx_runtime_1.jsx)(RepoList_1.RepoList, {
              org,
              repos,
              onOpenDialog: handleOpenDialog,
            }),
          }),
        ],
      }),
      (0, jsx_runtime_1.jsx)(ConnectRepoDialog_1.ConnectRepoDialog, {
        org,
        isOpen: isDialogOpen,
        onOpenChange: setIsDialogOpen,
      }),
    ],
  })
}
