'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.RunDetailTitle = RunDetailTitle
const lucide_react_1 = require('lucide-react')
const image_1 = require('next/image')
const jsx_runtime_1 = require('react/jsx-runtime')

const utils_1 = require('@/lib/utils')
function RunDetailTitle(_a) {
  const commitTitle = _a.commitTitle,
    runStatusDescriptor = _a.runStatusDescriptor,
    relativeStarted = _a.relativeStarted,
    absoluteStarted = _a.absoluteStarted,
    durationDisplay = _a.durationDisplay,
    statusDisplay = _a.statusDisplay,
    run = _a.run,
    shortSha = _a.shortSha,
    commitUrl = _a.commitUrl,
    orgName = _a.orgName,
    repoName = _a.repoName
  return (0, jsx_runtime_1.jsxs)('div', {
    className: 'flex items-start gap-3',
    children: [
      (0, jsx_runtime_1.jsx)(statusDisplay.Icon, {
        className: (0, utils_1.cn)(
          'size-14',
          statusDisplay.heroClassName,
          statusDisplay.shouldSpin ? 'animate-spin' : '',
        ),
      }),
      (0, jsx_runtime_1.jsx)('div', {
        className: 'flex-1',
        children: (0, jsx_runtime_1.jsxs)('div', {
          className: 'flex flex-col gap-2',
          children: [
            (0, jsx_runtime_1.jsx)('h1', {
              className: 'text-xl font-semibold text-foreground md:text-2xl',
              children: commitTitle,
            }),
            (0, jsx_runtime_1.jsxs)('div', {
              className: 'flex flex-wrap items-center gap-4 text-sm',
              children: [
                (0, jsx_runtime_1.jsxs)('span', {
                  className:
                    'inline-flex items-center gap-1 text-muted-foreground',
                  children: [
                    (0, jsx_runtime_1.jsx)(lucide_react_1.Timer, {
                      className: 'size-3.5',
                    }),
                    (0, jsx_runtime_1.jsxs)('span', {
                      className: 'flex items-center gap-1',
                      children: [
                        runStatusDescriptor,
                        ' ',
                        (0, jsx_runtime_1.jsx)('time', {
                          dateTime: absoluteStarted,
                          title: absoluteStarted,
                          children: relativeStarted,
                        }),
                        durationDisplay !== '—'
                          ? ' in '.concat(durationDisplay)
                          : '',
                      ],
                    }),
                  ],
                }),
                run.gitAuthor && run.gitAuthor.login
                  ? (0, jsx_runtime_1.jsxs)('div', {
                      className: 'flex items-center gap-2',
                      children: [
                        (0, jsx_runtime_1.jsx)(image_1.default, {
                          src: 'https://avatars.githubusercontent.com/u/'.concat(
                            run.gitAuthor.id,
                            '?v=4&s=32',
                          ),
                          alt: run.gitAuthor.name,
                          className: 'rounded-full',
                          width: 24,
                          height: 24,
                        }),
                        (0, jsx_runtime_1.jsx)('a', {
                          href: 'https://github.com/'.concat(
                            run.gitAuthor.login,
                          ),
                          target: '_blank',
                          rel: 'noopener noreferrer',
                          className:
                            'text-foreground hover:text-primary hover:underline',
                          children: (0, jsx_runtime_1.jsxs)('strong', {
                            children: ['@', run.gitAuthor.login],
                          }),
                        }),
                      ],
                    })
                  : null,
                (0, jsx_runtime_1.jsxs)('div', {
                  className: 'flex items-center gap-2',
                  children: [
                    (0, jsx_runtime_1.jsx)(lucide_react_1.GitBranch, {
                      className: 'size-4 text-muted-foreground',
                    }),
                    (0, jsx_runtime_1.jsx)('a', {
                      href: 'https://github.com/'
                        .concat(orgName, '/')
                        .concat(repoName, '/tree/')
                        .concat(run.branchName),
                      target: '_blank',
                      rel: 'noopener noreferrer',
                      className:
                        'font-mono text-xs font-medium text-primary underline hover:text-primary/80',
                      children: run.branchName,
                    }),
                  ],
                }),
                (0, jsx_runtime_1.jsxs)('div', {
                  className: 'flex items-center gap-2',
                  children: [
                    (0, jsx_runtime_1.jsx)(lucide_react_1.GitCommit, {
                      className: 'size-4 text-muted-foreground',
                    }),
                    commitUrl
                      ? (0, jsx_runtime_1.jsx)('a', {
                          href: commitUrl,
                          target: '_blank',
                          rel: 'noreferrer',
                          className:
                            'font-mono text-xs font-medium text-primary underline hover:text-primary/80',
                          children:
                            shortSha !== null && shortSha !== void 0
                              ? shortSha
                              : '—',
                        })
                      : (0, jsx_runtime_1.jsx)('span', {
                          className:
                            'font-mono text-xs font-medium text-foreground',
                          children:
                            shortSha !== null && shortSha !== void 0
                              ? shortSha
                              : '—',
                        }),
                  ],
                }),
              ],
            }),
          ],
        }),
      }),
    ],
  })
}
