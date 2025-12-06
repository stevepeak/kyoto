'use client';
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackDialog = FeedbackDialog;
var jsx_runtime_1 = require("react/jsx-runtime");
var lucide_react_1 = require("lucide-react");
var react_1 = require("react");
var navigation_1 = require("next/navigation");
var button_1 = require("@/components/ui/button");
var dialog_1 = require("@/components/ui/dialog");
var textarea_1 = require("@/components/ui/textarea");
var label_1 = require("@/components/ui/label");
var trpc_1 = require("@/client/trpc");
function FeedbackDialog(_a) {
    var _this = this;
    var trigger = _a.trigger;
    var _b = (0, react_1.useState)(false), open = _b[0], setOpen = _b[1];
    var _c = (0, react_1.useState)(''), feedback = _c[0], setFeedback = _c[1];
    var _d = (0, react_1.useState)(false), isSubmitting = _d[0], setIsSubmitting = _d[1];
    var _e = (0, react_1.useState)(null), error = _e[0], setError = _e[1];
    var _f = (0, react_1.useState)(false), success = _f[0], setSuccess = _f[1];
    var trpc = (0, trpc_1.useTRPCClient)();
    var pathname = (0, navigation_1.usePathname)();
    var currentUrl = typeof window !== 'undefined'
        ? window.location.href
        : "https://usekyoto.com".concat(pathname);
    var handleSubmit = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var result, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    e.preventDefault();
                    setError(null);
                    setIsSubmitting(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, trpc.feedback.submit.mutate({
                            feedback: feedback,
                            pageUrl: currentUrl,
                        })];
                case 2:
                    result = _a.sent();
                    if (result.success) {
                        setSuccess(true);
                        setFeedback('');
                        // Close dialog after a short delay
                        setTimeout(function () {
                            setOpen(false);
                            setSuccess(false);
                        }, 1500);
                    }
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _a.sent();
                    setError(err_1 instanceof Error
                        ? err_1.message
                        : 'Failed to submit feedback. Please try again.');
                    return [3 /*break*/, 5];
                case 4:
                    setIsSubmitting(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleOpenChange = function (newOpen) {
        if (!newOpen && !isSubmitting) {
            setOpen(false);
            setFeedback('');
            setError(null);
            setSuccess(false);
        }
        else if (newOpen) {
            setOpen(true);
        }
    };
    return ((0, jsx_runtime_1.jsxs)(dialog_1.Dialog, { open: open, onOpenChange: handleOpenChange, children: [(0, jsx_runtime_1.jsx)(dialog_1.DialogTrigger, { asChild: true, children: trigger || ((0, jsx_runtime_1.jsxs)(button_1.Button, { variant: "ghost", size: "sm", className: "gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.MessageSquare, { className: "h-4 w-4" }), "Share Feedback"] })) }), (0, jsx_runtime_1.jsxs)(dialog_1.DialogContent, { className: "sm:max-w-[500px]", children: [(0, jsx_runtime_1.jsxs)(dialog_1.DialogHeader, { children: [(0, jsx_runtime_1.jsx)(dialog_1.DialogTitle, { children: "Share Feedback" }), (0, jsx_runtime_1.jsx)(dialog_1.DialogDescription, { children: "We'd love to hear your thoughts! Your feedback will help us improve Kyoto." })] }), (0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSubmit, children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-4 py-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-2", children: [(0, jsx_runtime_1.jsx)(label_1.Label, { htmlFor: "feedback", children: "Your Feedback" }), (0, jsx_runtime_1.jsx)(textarea_1.Textarea, { id: "feedback", placeholder: "Tell us what you think, report a bug, or suggest a feature...", value: feedback, onChange: function (e) { return setFeedback(e.target.value); }, disabled: isSubmitting, rows: 6, className: "resize-none", required: true })] }), error && ((0, jsx_runtime_1.jsx)("div", { className: "rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive", children: error })), success && ((0, jsx_runtime_1.jsx)("div", { className: "rounded-md bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-600 dark:text-green-400", children: "Thank you! Your feedback has been submitted successfully." }))] }), (0, jsx_runtime_1.jsxs)(dialog_1.DialogFooter, { children: [(0, jsx_runtime_1.jsx)(button_1.Button, { type: "button", variant: "outline", onClick: function () { return handleOpenChange(false); }, disabled: isSubmitting, children: "Cancel" }), (0, jsx_runtime_1.jsx)(button_1.Button, { type: "submit", disabled: isSubmitting || !feedback.trim(), children: isSubmitting ? 'Submitting...' : 'Submit Feedback' })] })] })] })] }));
}
