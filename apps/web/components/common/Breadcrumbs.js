"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Breadcrumbs = Breadcrumbs;
var jsx_runtime_1 = require("react/jsx-runtime");
var utils_1 = require("@/lib/utils");
function Breadcrumbs(_a) {
    var items = _a.items, className = _a.className, right = _a.right;
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)('flex items-center justify-between px-4 py-3', className), children: [(0, jsx_runtime_1.jsx)("nav", { className: "text-sm text-muted-foreground flex items-center gap-1", children: items.map(function (item, index) {
                    var isLast = index === items.length - 1;
                    var hasHref = !!item.href;
                    var isOrg = index === 0;
                    var isRepo = index === 1;
                    return ((0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-1", children: [hasHref ? ((0, jsx_runtime_1.jsx)("a", { href: item.href, className: (0, utils_1.cn)('px-2 py-1 -mx-2 -my-1 rounded-md hover:bg-muted/80 transition-colors hover:text-foreground', 'text-muted-foreground', (isOrg || isRepo) && 'text-foreground', isRepo && 'font-semibold'), children: item.label })) : ((0, jsx_runtime_1.jsx)("span", { className: (0, utils_1.cn)('text-foreground', isRepo && 'font-semibold'), children: item.label })), !isLast && (0, jsx_runtime_1.jsx)("span", { className: "mx-2", children: "/" })] }, "".concat(item.label, "-").concat(index)));
                }) }), right ? (0, jsx_runtime_1.jsx)("div", { className: "ml-4", children: right }) : null] }));
}
