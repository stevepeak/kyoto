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
exports.SetupPage = SetupPage;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var navigation_1 = require("next/navigation");
var use_trigger_run_1 = require("@/hooks/use-trigger-run");
var trpc_1 = require("@/client/trpc");
var layout_1 = require("@/components/layout");
var card_1 = require("@/components/ui/card");
function SetupPage(_a) {
    var _b, _c, _d;
    var installationId = _a.installationId;
    var router = (0, navigation_1.useRouter)();
    var trpc = (0, trpc_1.useTRPCClient)();
    var _e = (0, react_1.useState)(null), apiError = _e[0], setApiError = _e[1];
    var _f = (0, react_1.useState)(true), isTriggering = _f[0], setIsTriggering = _f[1];
    var _g = (0, react_1.useState)(null), triggerHandle = _g[0], setTriggerHandle = _g[1];
    // Use the reusable trigger run hook
    var _h = (0, use_trigger_run_1.useTriggerRun)({
        runId: (_b = triggerHandle === null || triggerHandle === void 0 ? void 0 : triggerHandle.runId) !== null && _b !== void 0 ? _b : null,
        publicAccessToken: (_c = triggerHandle === null || triggerHandle === void 0 ? void 0 : triggerHandle.publicAccessToken) !== null && _c !== void 0 ? _c : null,
        showToast: false,
        onComplete: function () {
            // Navigate when completed
            router.push('/app');
        },
        onError: function () {
            // Error handling is done via the error state
        },
    }), isRunLoading = _h.isLoading, isFailed = _h.isFailed, runError = _h.error;
    (0, react_1.useEffect)(function () {
        function syncInstallation() {
            return __awaiter(this, void 0, void 0, function () {
                var result, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!installationId) {
                                setApiError('Installation ID is required');
                                setIsTriggering(false);
                                return [2 /*return*/];
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, trpc.org.syncInstallation.mutate({
                                    installationId: installationId,
                                })];
                        case 2:
                            result = _a.sent();
                            if (!result.success || !result.triggerHandle) {
                                setApiError('Failed to sync installation');
                                setIsTriggering(false);
                                return [2 /*return*/];
                            }
                            // Set trigger handle to enable the hook
                            setTriggerHandle({
                                runId: result.triggerHandle.id,
                                publicAccessToken: result.triggerHandle.publicAccessToken,
                            });
                            setIsTriggering(false);
                            return [3 /*break*/, 4];
                        case 3:
                            err_1 = _a.sent();
                            console.error('Failed to sync installation:', err_1);
                            setApiError(err_1 instanceof Error ? err_1.message : 'Failed to sync installation');
                            setIsTriggering(false);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        }
        void syncInstallation();
    }, [installationId, trpc]);
    // Derive display state from hook values and local state
    var error = (_d = apiError !== null && apiError !== void 0 ? apiError : (runError instanceof Error
        ? runError.message
        : runError
            ? String(runError)
            : null)) !== null && _d !== void 0 ? _d : (isFailed ? 'Installation sync failed' : null);
    var isLoading = isTriggering || isRunLoading;
    return ((0, jsx_runtime_1.jsx)(layout_1.AppLayout, { children: (0, jsx_runtime_1.jsx)("div", { className: "h-full w-full px-4 py-10 md:py-16 flex items-center justify-center", children: (0, jsx_runtime_1.jsxs)(card_1.Card, { className: "w-full max-w-xl text-center", children: [(0, jsx_runtime_1.jsxs)(card_1.CardHeader, { children: [(0, jsx_runtime_1.jsx)(card_1.CardTitle, { className: "text-2xl font-semibold", children: "Setting up your GitHub App" }), (0, jsx_runtime_1.jsx)(card_1.CardDescription, { children: isLoading
                                    ? 'Syncing your installation and memberships...'
                                    : error
                                        ? 'An error occurred while setting up your installation.'
                                        : 'Setup complete! Redirecting...' })] }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { children: isLoading ? ((0, jsx_runtime_1.jsx)("div", { className: "mt-4 flex items-center justify-center", children: (0, jsx_runtime_1.jsx)("div", { className: "h-32 w-32 bg-muted animate-pulse rounded-lg" }) })) : error ? ((0, jsx_runtime_1.jsxs)("div", { className: "mt-4 text-destructive", children: [(0, jsx_runtime_1.jsx)("p", { children: error }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-sm text-muted-foreground", children: "Please try refreshing the page or contact support if the issue persists." })] })) : null })] }) }) }));
}
