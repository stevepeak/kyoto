'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.StoryStatusCheck = StoryStatusCheck
const lucide_react_1 = require('lucide-react')
const jsx_runtime_1 = require('react/jsx-runtime')

const utils_1 = require('@/lib/utils')
function StoryStatusCheck(_a) {
  const status = _a.status,
    className = _a.className
  switch (status) {
    case 'pass':
      return (0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle2, {
        className: (0, utils_1.cn)('size-10 text-green-600', className),
      })
    case 'fail':
      return (0, jsx_runtime_1.jsx)(lucide_react_1.XCircle, {
        className: (0, utils_1.cn)('size-10 text-red-600', className),
      })
    case 'running':
      return (0, jsx_runtime_1.jsx)(lucide_react_1.Loader2, {
        className: (0, utils_1.cn)(
          'size-10 text-yellow-600 animate-spin',
          className,
        ),
      })
    case 'skipped':
      return (0, jsx_runtime_1.jsx)(lucide_react_1.MinusCircle, {
        className: (0, utils_1.cn)('size-10 text-muted-foreground', className),
      })
    case 'error':
      return (0, jsx_runtime_1.jsx)(lucide_react_1.AlertTriangle, {
        className: (0, utils_1.cn)('size-10 text-orange-600', className),
      })
    default:
      return null
  }
}
