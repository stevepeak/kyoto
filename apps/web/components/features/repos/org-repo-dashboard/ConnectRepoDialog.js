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
exports.ConnectRepoDialog = ConnectRepoDialog;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var navigation_1 = require("next/navigation");
var lucide_react_1 = require("lucide-react");
var dialog_1 = require("@/components/ui/dialog");
var input_1 = require("@/components/ui/input");
var button_1 = require("@/components/ui/button");
var trpc_1 = require("@/client/trpc");
var utils_1 = require("@/lib/utils");
var useRepoSearch_1 = require("./hooks/useRepoSearch");
function ConnectRepoDialog(_a) {
    var _this = this;
    var org = _a.org, isOpen = _a.isOpen, onOpenChange = _a.onOpenChange;
    var router = (0, navigation_1.useRouter)();
    var trpc = (0, trpc_1.useTRPCClient)();
    var _b = (0, react_1.useState)(''), searchQuery = _b[0], setSearchQuery = _b[1];
    var _c = (0, react_1.useState)(null), selectedRepoName = _c[0], setSelectedRepoName = _c[1];
    var _d = (0, react_1.useState)(false), enabling = _d[0], setEnabling = _d[1];
    var _e = (0, react_1.useState)([]), allRepos = _e[0], setAllRepos = _e[1];
    var _f = (0, react_1.useState)(false), loadingRepos = _f[0], setLoadingRepos = _f[1];
    var loadRepos = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var data, reposList, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(org === null || org === void 0 ? void 0 : org.slug)) {
                        return [2 /*return*/];
                    }
                    setLoadingRepos(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, trpc.repo.listByOrg.query({ orgName: org.slug })];
                case 2:
                    data = _a.sent();
                    reposList = data.repos.map(function (repo) { return ({
                        id: repo.id,
                        name: repo.name,
                        defaultBranch: repo.defaultBranch,
                        enabled: repo.enabled,
                        isPrivate: repo.isPrivate,
                    }); });
                    setAllRepos(reposList);
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _a.sent();
                    console.error('Failed to load repositories:', error_1);
                    return [3 /*break*/, 5];
                case 4:
                    setLoadingRepos(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); }, [org === null || org === void 0 ? void 0 : org.slug, trpc.repo.listByOrg]);
    var filteredRepos = (0, useRepoSearch_1.useRepoSearch)(allRepos, searchQuery, org === null || org === void 0 ? void 0 : org.slug);
    (0, react_1.useEffect)(function () {
        if (isOpen && (org === null || org === void 0 ? void 0 : org.slug)) {
            void loadRepos();
        }
    }, [isOpen, org === null || org === void 0 ? void 0 : org.slug, loadRepos]);
    var handleEnableRepo = function () { return __awaiter(_this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(org === null || org === void 0 ? void 0 : org.slug) || !selectedRepoName) {
                        return [2 /*return*/];
                    }
                    setEnabling(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, trpc.repo.enableRepo.mutate({
                            orgName: org.slug,
                            repoName: selectedRepoName,
                        })];
                case 2:
                    _a.sent();
                    router.push("/org/".concat(org.slug, "/repo/").concat(selectedRepoName));
                    return [3 /*break*/, 5];
                case 3:
                    error_2 = _a.sent();
                    console.error('Failed to connect repository:', error_2);
                    return [3 /*break*/, 5];
                case 4:
                    setEnabling(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleOpenChange = function (open) {
        onOpenChange(open);
        if (!open) {
            setSearchQuery('');
            setSelectedRepoName(null);
        }
    };
    return ((0, jsx_runtime_1.jsx)(dialog_1.Dialog, { open: isOpen, onOpenChange: handleOpenChange, children: (0, jsx_runtime_1.jsxs)(dialog_1.DialogContent, { children: [(0, jsx_runtime_1.jsxs)(dialog_1.DialogHeader, { children: [(0, jsx_runtime_1.jsx)(dialog_1.DialogTitle, { children: "Connect Repository" }), (0, jsx_runtime_1.jsxs)(dialog_1.DialogDescription, { children: ["Search and select a repository to connect for", ' ', (org === null || org === void 0 ? void 0 : org.slug) ? "".concat(org.slug) : 'this organization', "."] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4 py-4", children: [(0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsx)(input_1.Input, { placeholder: "Search by repository name...", value: searchQuery, onChange: function (e) {
                                    setSearchQuery(e.target.value);
                                    setSelectedRepoName(null);
                                } }) }), loadingRepos ? ((0, jsx_runtime_1.jsx)("div", { className: "text-sm text-muted-foreground py-4 text-center", children: "Loading repositories..." })) : filteredRepos.length === 0 ? (searchQuery.trim() ? ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-3 py-6 text-center text-sm text-muted-foreground", children: [(0, jsx_runtime_1.jsx)("p", { className: "font-medium text-foreground", children: "No matching repositories found" }), (0, jsx_runtime_1.jsxs)("p", { children: ["Need to connect another repo?", ' ', (0, jsx_runtime_1.jsx)("a", { href: "/setup?owner=".concat(org === null || org === void 0 ? void 0 : org.slug), className: "font-medium text-primary underline", target: "_blank", rel: "noreferrer", children: "Configure the GitHub app" }), ' ', "to add more repositories and projects to Kyoto."] }), (0, jsx_runtime_1.jsx)("p", { children: "After updating the installation, reopen this dialog to search again." })] })) : ((0, jsx_runtime_1.jsx)("div", { className: "text-sm text-muted-foreground py-4 text-center", children: "Start typing to search for repositories" }))) : ((0, jsx_runtime_1.jsx)("div", { className: "border rounded-md max-h-60 overflow-auto", children: (0, jsx_runtime_1.jsx)("ul", { className: "divide-y", children: filteredRepos.map(function (r) { return ((0, jsx_runtime_1.jsx)("li", { className: (0, utils_1.cn)('cursor-pointer p-3 hover:bg-accent', selectedRepoName === r.name && 'bg-accent'), onClick: function () {
                                        setSelectedRepoName(r.name);
                                    }, children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex min-w-0 items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.BookMarked, { className: "h-4 w-4 text-muted-foreground" }), (0, jsx_runtime_1.jsx)("span", { className: "truncate text-sm font-medium text-foreground", children: r.name })] }), (0, jsx_runtime_1.jsx)("span", { className: "flex-shrink-0 rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground", children: r.isPrivate ? 'Private' : 'Public' })] }) }, r.id)); }) }) }))] }), (0, jsx_runtime_1.jsxs)(dialog_1.DialogFooter, { children: [(0, jsx_runtime_1.jsx)(button_1.Button, { variant: "outline", onClick: function () {
                                handleOpenChange(false);
                            }, children: "Cancel" }), (0, jsx_runtime_1.jsx)(button_1.Button, { onClick: function () {
                                void handleEnableRepo();
                            }, disabled: !selectedRepoName || enabling, children: enabling ? 'Connecting...' : 'Connect repository' })] })] }) }));
}
