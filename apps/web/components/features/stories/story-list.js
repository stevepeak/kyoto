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
exports.StoryList = StoryList;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var button_1 = require("@/components/ui/button");
var EmptyState_1 = require("@/components/common/EmptyState");
var keyboard_shortcut_hint_1 = require("@/components/common/keyboard-shortcut-hint");
var story_card_1 = require("./story-card");
var trpc_1 = require("@/client/trpc");
var sonner_1 = require("sonner");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
function StoryList(_a) {
    var _this = this;
    var stories = _a.stories, orgName = _a.orgName, repoName = _a.repoName, onStoriesChange = _a.onStoriesChange;
    var trpc = (0, trpc_1.useTRPCClient)();
    var _b = (0, react_1.useState)(new Set()), selectedIds = _b[0], setSelectedIds = _b[1];
    var _c = (0, react_1.useState)(null), focusedIndex = _c[0], setFocusedIndex = _c[1];
    var _d = (0, react_1.useState)(false), isBulkActionLoading = _d[0], setIsBulkActionLoading = _d[1];
    var listRef = (0, react_1.useRef)(null);
    var itemRefs = (0, react_1.useRef)([]);
    // Reset selection when stories change
    (0, react_1.useEffect)(function () {
        setSelectedIds(new Set());
        setFocusedIndex(null);
    }, [stories.length]);
    // Handle keyboard navigation
    (0, react_1.useEffect)(function () {
        var handleKeyDown = function (e) {
            var _a;
            // Only handle if we're in the stories list area or if no input is focused
            var activeElement = document.activeElement;
            var isInputFocused = (activeElement === null || activeElement === void 0 ? void 0 : activeElement.tagName) === 'INPUT' ||
                (activeElement === null || activeElement === void 0 ? void 0 : activeElement.tagName) === 'TEXTAREA' ||
                (activeElement === null || activeElement === void 0 ? void 0 : activeElement.getAttribute('contenteditable')) === 'true';
            if (isInputFocused) {
                return;
            }
            // Check if we're in the stories list area
            if (!((_a = listRef.current) === null || _a === void 0 ? void 0 : _a.contains(activeElement))) {
                // If not in list, only handle if clicking in the stories panel
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIndex(function (prev) {
                    if (prev === null) {
                        return 0;
                    }
                    return Math.min(prev + 1, stories.length - 1);
                });
            }
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedIndex(function (prev) {
                    if (prev === null) {
                        return stories.length - 1;
                    }
                    return Math.max(prev - 1, 0);
                });
            }
            else if (e.key === 'x' || e.key === 'X') {
                e.preventDefault();
                if (focusedIndex !== null &&
                    focusedIndex >= 0 &&
                    focusedIndex < stories.length) {
                    var storyId_1 = stories[focusedIndex].id;
                    setSelectedIds(function (prev) {
                        var next = new Set(prev);
                        if (next.has(storyId_1)) {
                            next.delete(storyId_1);
                        }
                        else {
                            next.add(storyId_1);
                        }
                        return next;
                    });
                }
            }
            else if (e.key === 'Escape') {
                e.preventDefault();
                setSelectedIds(new Set());
                setFocusedIndex(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return function () { return window.removeEventListener('keydown', handleKeyDown); };
    }, [focusedIndex, stories]);
    // Focus the item when focusedIndex changes
    (0, react_1.useEffect)(function () {
        var _a;
        if (focusedIndex !== null && itemRefs.current[focusedIndex]) {
            (_a = itemRefs.current[focusedIndex]) === null || _a === void 0 ? void 0 : _a.focus();
        }
    }, [focusedIndex]);
    var handleToggleSelection = (0, react_1.useCallback)(function (storyId) {
        setSelectedIds(function (prev) {
            var next = new Set(prev);
            if (next.has(storyId)) {
                next.delete(storyId);
            }
            else {
                next.add(storyId);
            }
            return next;
        });
    }, []);
    var handleSelectAll = (0, react_1.useCallback)(function () {
        if (selectedIds.size === stories.length) {
            setSelectedIds(new Set());
        }
        else {
            setSelectedIds(new Set(stories.map(function (s) { return s.id; })));
        }
    }, [selectedIds.size, stories]);
    var handleBulkPause = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (selectedIds.size === 0) {
                        return [2 /*return*/];
                    }
                    setIsBulkActionLoading(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, trpc.story.bulkPause.mutate({
                            orgName: orgName,
                            repoName: repoName,
                            storyIds: Array.from(selectedIds),
                        })];
                case 2:
                    _a.sent();
                    sonner_1.toast.success("Paused ".concat(selectedIds.size, " ").concat(selectedIds.size === 1 ? 'story' : 'stories'));
                    setSelectedIds(new Set());
                    onStoriesChange === null || onStoriesChange === void 0 ? void 0 : onStoriesChange();
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _a.sent();
                    sonner_1.toast.error(error_1 instanceof Error ? error_1.message : 'Failed to pause stories');
                    return [3 /*break*/, 5];
                case 4:
                    setIsBulkActionLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); }, [selectedIds, orgName, repoName, trpc, onStoriesChange]);
    var handleBulkArchive = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (selectedIds.size === 0) {
                        return [2 /*return*/];
                    }
                    setIsBulkActionLoading(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, trpc.story.bulkArchive.mutate({
                            orgName: orgName,
                            repoName: repoName,
                            storyIds: Array.from(selectedIds),
                        })];
                case 2:
                    _a.sent();
                    sonner_1.toast.success("Archived ".concat(selectedIds.size, " ").concat(selectedIds.size === 1 ? 'story' : 'stories'));
                    setSelectedIds(new Set());
                    onStoriesChange === null || onStoriesChange === void 0 ? void 0 : onStoriesChange();
                    return [3 /*break*/, 5];
                case 3:
                    error_2 = _a.sent();
                    sonner_1.toast.error(error_2 instanceof Error ? error_2.message : 'Failed to archive stories');
                    return [3 /*break*/, 5];
                case 4:
                    setIsBulkActionLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); }, [selectedIds, orgName, repoName, trpc, onStoriesChange]);
    if (stories.length === 0) {
        return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("style", { children: "\n          @keyframes shimmer {\n            0% {\n              transform: translateX(-100%);\n            }\n            100% {\n              transform: translateX(100%);\n            }\n          }\n          .shimmer-effect {\n            animation: shimmer 3s infinite;\n          }\n        " }), (0, jsx_runtime_1.jsx)(EmptyState_1.EmptyState, { kanji: "\u3055\u304F\u305B\u3044", kanjiTitle: "Sakusei - to create.", title: "Craft your first story", description: "Stories encapsulate the intent of a user behavior or technical workflow within your product. Articulate your story in natural language, then Kyoto will evaluate the intent to ensure the code aligns with your requirements.", action: (0, jsx_runtime_1.jsx)("div", { className: "flex flex-col sm:flex-row items-center gap-4", children: (0, jsx_runtime_1.jsx)(button_1.Button, { asChild: true, size: "lg", children: (0, jsx_runtime_1.jsxs)("a", { href: "/org/".concat(orgName, "/repo/").concat(repoName, "/stories/new"), children: ["Craft new story", (0, jsx_runtime_1.jsx)(keyboard_shortcut_hint_1.KeyboardShortcutHint, {})] }) }) }) })] }));
    }
    var hasSelection = selectedIds.size > 0;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col", children: [hasSelection && ((0, jsx_runtime_1.jsxs)("div", { className: "sticky top-0 z-10 bg-background border-b px-4 py-2 flex items-center justify-between gap-2", children: [(0, jsx_runtime_1.jsxs)("span", { className: "text-sm text-muted-foreground", children: [selectedIds.size, " ", selectedIds.size === 1 ? 'story' : 'stories', ' ', "selected"] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsxs)(button_1.Button, { variant: "outline", size: "sm", onClick: handleBulkPause, disabled: isBulkActionLoading, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Pause, { className: "h-4 w-4 mr-1" }), "Pause"] }), (0, jsx_runtime_1.jsxs)(button_1.Button, { variant: "outline", size: "sm", onClick: handleBulkArchive, disabled: isBulkActionLoading, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Archive, { className: "h-4 w-4 mr-1" }), "Archive"] })] })] })), (0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-2 px-4 py-2 border-b bg-muted/50", children: (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handleSelectAll, className: "text-xs text-muted-foreground hover:text-foreground transition-colors", children: selectedIds.size === stories.length ? 'Deselect all' : 'Select all' }) }), (0, jsx_runtime_1.jsx)("ul", { ref: listRef, className: "divide-y divide-border", children: stories.map(function (story, index) { return ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsx)("div", { ref: function (el) {
                            itemRefs.current[index] = el;
                        }, tabIndex: 0, className: (0, utils_1.cn)('focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', focusedIndex === index && 'ring-2 ring-ring ring-offset-2'), onFocus: function () { return setFocusedIndex(index); }, onBlur: function (e) {
                            var _a;
                            // Only clear focus if we're not moving to another item in the list
                            if (!((_a = listRef.current) === null || _a === void 0 ? void 0 : _a.contains(e.relatedTarget))) {
                                // Keep focus index for keyboard navigation
                            }
                        }, children: (0, jsx_runtime_1.jsx)(story_card_1.StoryCard, { id: story.id, name: story.name, href: "/org/".concat(orgName, "/repo/").concat(repoName, "/stories/").concat(story.id), groups: story.groups, state: story.state, isSelected: selectedIds.has(story.id), onToggleSelection: function () { return handleToggleSelection(story.id); } }) }) }, story.id)); }) })] }));
}
