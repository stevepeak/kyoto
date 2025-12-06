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
exports.TopNav = TopNav;
var jsx_runtime_1 = require("react/jsx-runtime");
var lucide_react_1 = require("lucide-react");
var react_1 = require("react");
var navigation_1 = require("next/navigation");
var button_1 = require("@/components/ui/button");
var dropdown_menu_1 = require("@/components/ui/dropdown-menu");
var trpc_1 = require("@/client/trpc");
var auth_client_1 = require("@/client/auth-client");
var Breadcrumbs_1 = require("@/components/common/Breadcrumbs");
var feedback_dialog_1 = require("@/components/common/feedback-dialog");
function TopNav(_a) {
    var _this = this;
    var _b, _c;
    var breadcrumbs = _a.breadcrumbs, right = _a.right;
    var trpc = (0, trpc_1.useTRPCClient)();
    var router = (0, navigation_1.useRouter)();
    var _d = (0, react_1.useState)(null), githubLogin = _d[0], setGithubLogin = _d[1];
    var session = (0, auth_client_1.useSession)();
    var user = (_b = session.data) === null || _b === void 0 ? void 0 : _b.user;
    var userImage = user === null || user === void 0 ? void 0 : user.image;
    var userName = (user === null || user === void 0 ? void 0 : user.name) || (user === null || user === void 0 ? void 0 : user.email) || 'User';
    var handleSignOut = function () { return __awaiter(_this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, auth_client_1.signOut)()];
                case 1:
                    _a.sent();
                    router.push('/');
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error('Failed to sign out', error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    (0, react_1.useEffect)(function () {
        if (!session.data) {
            return;
        }
        var isMounted = true;
        void (function () { return __awaiter(_this, void 0, void 0, function () {
            var result, error_2;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, trpc.user.get.query()];
                    case 1:
                        result = _b.sent();
                        if (!isMounted) {
                            return [2 /*return*/];
                        }
                        setGithubLogin((_a = result.githubLogin) !== null && _a !== void 0 ? _a : null);
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _b.sent();
                        console.error('Failed to fetch GitHub login', error_2);
                        if (!isMounted) {
                            return [2 /*return*/];
                        }
                        setGithubLogin(null);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); })();
        return function () {
            isMounted = false;
        };
    }, [session.data, trpc]);
    var showGithubLogin = session.data ? githubLogin : null;
    var rightActions = ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [right ? (0, jsx_runtime_1.jsx)("div", { children: right }) : null, ((_c = session.data) === null || _c === void 0 ? void 0 : _c.user) ? (0, jsx_runtime_1.jsx)(feedback_dialog_1.FeedbackDialog, {}) : null, (0, jsx_runtime_1.jsxs)(dropdown_menu_1.DropdownMenu, { children: [(0, jsx_runtime_1.jsx)(dropdown_menu_1.DropdownMenuTrigger, { asChild: true, children: (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", className: "h-8 w-8 rounded-full p-0", title: userName, children: userImage ? ((0, jsx_runtime_1.jsx)("img", { src: userImage, alt: userName, className: "h-8 w-8 rounded-full" })) : ((0, jsx_runtime_1.jsx)("div", { className: "h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground", children: userName.charAt(0).toUpperCase() })) }) }), (0, jsx_runtime_1.jsxs)(dropdown_menu_1.DropdownMenuContent, { align: "end", children: [(0, jsx_runtime_1.jsxs)("div", { className: "px-2 py-1.5", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-medium", children: userName }), showGithubLogin ? ((0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-muted-foreground", children: ["@", showGithubLogin] })) : null] }), (0, jsx_runtime_1.jsx)(dropdown_menu_1.DropdownMenuSeparator, {}), (0, jsx_runtime_1.jsxs)(dropdown_menu_1.DropdownMenuItem, { onClick: handleSignOut, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.LogOut, { className: "mr-2 h-4 w-4" }), (0, jsx_runtime_1.jsx)("span", { children: "Sign out" })] })] })] })] }));
    return ((0, jsx_runtime_1.jsx)("div", { className: "border-b bg-muted/30", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-3 px-4 py-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-4 flex-1 min-w-0", children: [(0, jsx_runtime_1.jsx)("a", { href: "/", className: "flex items-center gap-2 text-foreground transition-colors shrink-0", children: (0, jsx_runtime_1.jsx)("span", { className: "font-display text-lg", children: "\u26E9\uFE0F Kyoto" }) }), breadcrumbs ? ((0, jsx_runtime_1.jsx)(Breadcrumbs_1.Breadcrumbs, { items: breadcrumbs, className: "px-0 py-0 flex-1 min-w-0" })) : null] }), rightActions] }) }));
}
