"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Label = void 0;
var jsx_runtime_1 = require("react/jsx-runtime");
var React = require("react");
var LabelPrimitive = require("@radix-ui/react-label");
var class_variance_authority_1 = require("class-variance-authority");
var utils_1 = require("@/lib/utils");
var labelVariants = (0, class_variance_authority_1.cva)('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70');
var Label = React.forwardRef(function (_a, ref) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return ((0, jsx_runtime_1.jsx)(LabelPrimitive.Root, __assign({ ref: ref, className: (0, utils_1.cn)(labelVariants(), className) }, props)));
});
exports.Label = Label;
Label.displayName = LabelPrimitive.Root.displayName;
