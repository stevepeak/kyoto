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
exports.SignIn = SignIn;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var navigation_1 = require("next/navigation");
var lucide_react_1 = require("lucide-react");
var auth_client_1 = require("@/client/auth-client");
var button_1 = require("@/components/ui/button");
var EmptyState_1 = require("@/components/common/EmptyState");
function SignIn() {
    var _this = this;
    var _a = (0, react_1.useState)(false), loading = _a[0], setLoading = _a[1];
    var session = (0, auth_client_1.useSession)();
    var searchParams = (0, navigation_1.useSearchParams)();
    // Redirect if user is already logged in, respecting the redirect query parameter
    (0, react_1.useEffect)(function () {
        var _a;
        if (((_a = session.data) === null || _a === void 0 ? void 0 : _a.user) && !session.isPending) {
            var redirectTo = searchParams.get('redirect') || '/app';
            window.location.href = redirectTo;
        }
    }, [session.data, session.isPending, searchParams]);
    var handleGitHubSignIn = function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setLoading(true);
                    return [4 /*yield*/, auth_client_1.signIn.social({
                            provider: 'github',
                            callbackURL: '/setup',
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
    return ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)(EmptyState_1.EmptyState, { kanji: "\u30ED\u30B0\u30A4\u30F3", kanjiTitle: "Roguin - to login.", title: "Welcome to Kyoto", description: "Vibe crafted to help you ship working code.", action: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "flex flex-col items-center gap-4 mb-8", children: (0, jsx_runtime_1.jsxs)(button_1.Button, { size: "lg", disabled: loading, onClick: handleGitHubSignIn, className: "gap-2", children: [loading ? ((0, jsx_runtime_1.jsx)(lucide_react_1.Loader2, { className: "h-4 w-4 animate-spin", "aria-hidden": "true" })) : ((0, jsx_runtime_1.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "1em", height: "1em", viewBox: "0 0 24 24", className: "h-4 w-4", children: (0, jsx_runtime_1.jsx)("path", { fill: "currentColor", d: "M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33c.85 0 1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z" }) })), loading ? 'Signing in...' : 'Sign in with GitHub'] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "text-balance text-center text-xs text-muted-foreground", children: ["By clicking continue, you agree to our", ' ', (0, jsx_runtime_1.jsx)("a", { href: "#", className: "underline underline-offset-4 hover:text-primary", children: "Terms of Service" }), ' ', "and", ' ', (0, jsx_runtime_1.jsx)("a", { href: "#", className: "underline underline-offset-4 hover:text-primary", children: "Privacy Policy" }), "."] })] }) }) }));
}
