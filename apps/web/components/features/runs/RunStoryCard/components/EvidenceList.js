'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.EvidenceList = EvidenceList
const jsx_runtime_1 = require('react/jsx-runtime')

const EvidenceParser_1 = require('../EvidenceParser')
function EvidenceList(_a) {
  const evidence = _a.evidence,
    orgName = _a.orgName,
    repoName = _a.repoName,
    commitSha = _a.commitSha
  if (evidence.length === 0) {
    return null
  }
  return (0, jsx_runtime_1.jsxs)('div', {
    className: 'mt-2 space-y-1',
    children: [
      (0, jsx_runtime_1.jsx)('div', {
        className: 'text-xs font-medium text-muted-foreground',
        children: 'Evidence:',
      }),
      (0, jsx_runtime_1.jsx)('ul', {
        className:
          'list-disc list-inside space-y-1 text-xs text-muted-foreground',
        children: evidence.map(function (ev, evIndex) {
          const _a = (0, EvidenceParser_1.parseEvidenceToGitHubLink)(
              ev,
              orgName,
              repoName,
              commitSha,
            ),
            text = _a.text,
            url = _a.url
          return (0, jsx_runtime_1.jsx)(
            'li',
            {
              children: url
                ? (0, jsx_runtime_1.jsx)('a', {
                    href: url,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    className: 'text-primary hover:underline',
                    children: text,
                  })
                : text,
            },
            evIndex,
          )
        }),
      }),
    ],
  })
}
