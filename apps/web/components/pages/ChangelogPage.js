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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangelogPage = ChangelogPage;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var sonner_1 = require("sonner");
var shiki_1 = require("shiki");
var layout_1 = require("@/components/layout");
var card_1 = require("@/components/ui/card");
var button_1 = require("@/components/ui/button");
var tiptap_editor_1 = require("@/components/tiptap-editor");
function XLogo(_a) {
    var className = _a.className;
    return ((0, jsx_runtime_1.jsx)("svg", { viewBox: "0 0 24 24", className: className, fill: "currentColor", xmlns: "http://www.w3.org/2000/svg", children: (0, jsx_runtime_1.jsx)("path", { d: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" }) }));
}
var SAMPLE_WORKFLOW_RESULT = {
    scopeItems: ['Checkout Flow', 'Oauth'],
};
function buildSampleChangelogData() {
    var pullRequestNumber = 482;
    return {
        pullRequest: {
            number: pullRequestNumber,
            title: 'Refactor checkout flow',
            branch: 'feature/intent-checkout',
            author: {
                username: 'stevepeak',
                avatarUrl: 'https://avatars.githubusercontent.com/u/2041757?v=4',
            },
        },
        changelogSummary: {
            sections: [
                {
                    title: 'Checkout flow',
                    items: [
                        'Refactored <CheckoutForm> into <CheckoutLayout> for clearer steps',
                        'Moved payment validation into shared hook usePaymentGuard',
                    ],
                },
                {
                    title: 'API',
                    items: [
                        'Added POST /orders/preview to support order summaries',
                        'Deprecated /cart/lock in favor of /cart/hold',
                    ],
                },
                {
                    title: 'Tests',
                    items: [
                        'Updated intent story "guest checkout remembers email"',
                        'Added regression check for order summary totals',
                    ],
                },
            ],
        },
        storiesPanel: {
            stories: [
                {
                    id: 'story-guest-email',
                    title: 'Guest checkout remembers email',
                    status: 'updated',
                    area: 'Checkout',
                    summary: 'When a guest enters their email at checkout, it is **remembered** even if they navigate back and forth between steps or refresh the page.',
                    evidence: 'components/checkout/EmailStep.tsx:18-54',
                },
                {
                    id: 'story-order-summary',
                    title: 'User sees order summary before paying',
                    status: 'new',
                    area: 'Checkout',
                    summary: 'Before paying, the shopper sees a clear order summary with:\n\n- Items and quantities\n- Totals that **update** as items change\n- Discounts and shipping costs',
                    evidence: 'components/checkout/OrderSummary.tsx:12-80',
                },
                {
                    id: 'story-payment-failure',
                    title: 'Payment failure surfaces a clear error state',
                    status: 'at-risk',
                    area: 'Payments',
                    summary: 'If a payment attempt fails, the shopper sees a clear error message and can:\n\n1. Retry with the same method\n2. Pick a different payment method',
                    evidence: 'components/checkout/PaymentStep.tsx:40-96',
                },
            ],
            summaryNote: '2 existing stories, discovered 1 new story, and marked 1 at risk.',
        },
        workflowResult: SAMPLE_WORKFLOW_RESULT,
    };
}
function ChangelogPage(_a) {
    var orgName = _a.orgName, repoName = _a.repoName;
    var data = buildSampleChangelogData();
    return ((0, jsx_runtime_1.jsx)(layout_1.AppLayout, { breadcrumbs: [
            { label: orgName, href: "/org/".concat(orgName) },
            { label: repoName, href: "/org/".concat(orgName, "/repo/").concat(repoName) },
            {
                label: 'Changelog',
                href: "/org/".concat(orgName, "/repo/").concat(repoName, "/changelog"),
            },
        ], children: (0, jsx_runtime_1.jsxs)("main", { className: "mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl flex-col gap-8 px-6 py-10 lg:py-16", children: [(0, jsx_runtime_1.jsxs)("header", { className: "flex items-start justify-between gap-4 rounded-3xl border border-border/70 bg-card/80 px-6 py-5 shadow-lg", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex-1", children: [(0, jsx_runtime_1.jsx)("h1", { className: "font-display text-2xl text-foreground sm:text-3xl", children: data.pullRequest.title }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground", children: [(0, jsx_runtime_1.jsxs)("a", { href: "https://github.com/".concat(data.pullRequest.author.username), target: "_blank", rel: "noopener noreferrer", className: "flex items-center gap-2 hover:text-foreground transition-colors", children: [(0, jsx_runtime_1.jsx)("img", { src: data.pullRequest.author.avatarUrl, alt: data.pullRequest.author.username, className: "size-4 rounded-full" }), (0, jsx_runtime_1.jsx)("span", { children: data.pullRequest.author.username })] }), (0, jsx_runtime_1.jsx)("span", { children: "\u00B7" }), (0, jsx_runtime_1.jsxs)("a", { href: "https://github.com/".concat(orgName, "/").concat(repoName, "/tree/").concat(data.pullRequest.branch), target: "_blank", rel: "noopener noreferrer", className: "flex items-center gap-2 hover:text-foreground transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.GitBranch, { className: "size-4 text-muted-foreground" }), (0, jsx_runtime_1.jsx)("span", { className: "font-mono text-xs", children: data.pullRequest.branch })] })] }), data.workflowResult.scopeItems.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-3 flex flex-wrap items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs text-muted-foreground", children: "Impacted domains:" }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-1.5", children: data.workflowResult.scopeItems.map(function (scope) { return ((0, jsx_runtime_1.jsx)("span", { className: "inline-flex items-center rounded-full bg-muted px-2 py-[3px] text-[10px] font-medium text-muted-foreground", children: scope }, scope)); }) })] }))] }), (0, jsx_runtime_1.jsxs)("a", { href: "https://github.com/".concat(orgName, "/").concat(repoName, "/pull/").concat(data.pullRequest.number), target: "_blank", rel: "noopener noreferrer", className: "text-xl font-semibold text-muted-foreground hover:text-foreground transition-colors sm:text-2xl", children: ["#", data.pullRequest.number] })] }), (0, jsx_runtime_1.jsxs)("section", { className: "grid gap-6 md:grid-cols-2", children: [(0, jsx_runtime_1.jsx)(ChangelogSummaryCard, { orgName: orgName, repoName: repoName, pullRequestNumber: data.pullRequest.number, summary: data.changelogSummary, workflowResult: data.workflowResult }), (0, jsx_runtime_1.jsx)(FeatureFilmCard, {})] }), (0, jsx_runtime_1.jsx)(StoriesCarousel, { orgName: orgName, repoName: repoName, storiesPanel: data.storiesPanel, branch: data.pullRequest.branch })] }) }));
}
function ChangelogSummaryCard(_a) {
    var _this = this;
    var orgName = _a.orgName, repoName = _a.repoName, pullRequestNumber = _a.pullRequestNumber, summary = _a.summary, workflowResult = _a.workflowResult;
    var buildChangelogText = function () {
        var scopeSection = workflowResult.scopeItems.length > 0
            ? __spreadArray(__spreadArray([
                'Scopes:'
            ], workflowResult.scopeItems.map(function (scope) { return "  - ".concat(scope); }), true), [
                '',
            ], false) : [];
        var sectionLines = summary.sections.flatMap(function (section) { return __spreadArray(__spreadArray([
            "".concat(section.title, ":")
        ], section.items.map(function (item) { return "  - ".concat(item); }), true), [
            '',
        ], false); });
        return __spreadArray(__spreadArray(['Changelog', ''], scopeSection, true), sectionLines, true).join('\n');
    };
    var handleCopyChangelog = function () { return __awaiter(_this, void 0, void 0, function () {
        var changelogText, _error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    changelogText = buildChangelogText();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, navigator.clipboard.writeText(changelogText)];
                case 2:
                    _a.sent();
                    sonner_1.toast.success('Changelog copied to clipboard');
                    return [3 /*break*/, 4];
                case 3:
                    _error_1 = _a.sent();
                    sonner_1.toast.error('Failed to copy changelog');
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleShareOnX = function () {
        var changelogText = buildChangelogText();
        var shareUrl = "https://github.com/".concat(orgName, "/").concat(repoName);
        var shareText = "".concat(changelogText, "\n\n").concat(shareUrl);
        var xUrl = "https://x.com/intent/post?text=".concat(encodeURIComponent(shareText), "&url=").concat(encodeURIComponent(shareUrl));
        window.open(xUrl, '_blank', 'noopener,noreferrer');
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 space-y-3", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs font-semibold tracking-[0.3em] text-primary", title: "Henka - Change.", children: "\u5909\u66F4" }), (0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-semibold", children: "Changelog" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-muted-foreground", children: ["Summary of changes for pull request #", pullRequestNumber] })] }) }), (0, jsx_runtime_1.jsxs)(card_1.Card, { className: "group relative overflow-hidden border-border/70 bg-card/80 shadow-lg", children: [(0, jsx_runtime_1.jsxs)("div", { className: "absolute right-4 top-4 z-10 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100", children: [(0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", size: "sm", onClick: handleCopyChangelog, "aria-label": "Copy changelog", className: "h-8 w-8 p-0", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Copy, { className: "size-4" }) }), (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", size: "sm", onClick: handleShareOnX, "aria-label": "Share on X", className: "h-8 w-8 p-0", children: (0, jsx_runtime_1.jsx)(XLogo, { className: "size-4" }) })] }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { className: "space-y-4 pt-4", children: summary.sections.map(function (section) { return ((0, jsx_runtime_1.jsxs)("section", { className: "space-y-1", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-semibold text-foreground", children: section.title }), (0, jsx_runtime_1.jsx)("ul", { className: "list-disc space-y-1 pl-4 text-xs text-muted-foreground", children: section.items.map(function (item) { return ((0, jsx_runtime_1.jsx)("li", { children: item }, item)); }) })] }, section.title)); }) })] })] }));
}
function FeatureFilmCard() {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs font-semibold tracking-[0.3em] text-primary", title: "Film.", children: "\u6620\u753B" }), (0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-semibold", children: "Feature Film" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-muted-foreground", children: "Watch the film to understand the changes fully." })] }), (0, jsx_runtime_1.jsx)(card_1.Card, { className: "relative overflow-hidden border-border/70 bg-card/80 shadow-lg aspect-video", children: (0, jsx_runtime_1.jsx)(card_1.CardContent, { className: "flex items-center justify-center p-0 h-full", children: (0, jsx_runtime_1.jsx)("div", { className: "w-full h-full bg-muted/30 flex items-center justify-center", children: (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-muted-foreground", children: "\uD83C\uDFA5 Feature Film" }) }) }) })] }));
}
function StoriesCarousel(_a) {
    var orgName = _a.orgName, repoName = _a.repoName, storiesPanel = _a.storiesPanel, branch = _a.branch;
    var _b = (0, react_1.useState)(new Set()), processedStories = _b[0], setProcessedStories = _b[1];
    // Filter out processed stories to get visible stories
    var visibleStories = storiesPanel.stories.filter(function (story) { return !processedStories.has(story.id); });
    var currentStory = visibleStories[0];
    var allStoriesProcessed = visibleStories.length === 0;
    var handleAccept = function () {
        if (currentStory) {
            setProcessedStories(function (prev) {
                var next = new Set(prev);
                next.add(currentStory.id);
                return next;
            });
        }
    };
    var handleIgnore = function () {
        if (currentStory) {
            setProcessedStories(function (prev) {
                var next = new Set(prev);
                next.add(currentStory.id);
                return next;
            });
        }
    };
    // Get stories that should be visible in the stack (current + next 2)
    var stackedStories = visibleStories.slice(0, 3);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs font-semibold tracking-[0.3em] text-primary", title: "Sut\u014Dr\u012B - Stories.", children: "\u30B9\u30C8\u30FC\u30EA\u30FC" }), (0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-semibold", children: "Impacted Stories" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-muted-foreground", children: storiesPanel.summaryNote })] }), allStoriesProcessed ? ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center py-12", children: (0, jsx_runtime_1.jsx)(ZenBrushStroke, {}) })) : ((0, jsx_runtime_1.jsx)("div", { className: "relative", style: { minHeight: '400px' }, children: stackedStories.map(function (story, stackIndex) {
                    var isActive = stackIndex === 0;
                    var zIndex = stackedStories.length - stackIndex;
                    var scale = 1 - stackIndex * 0.04;
                    var opacity = 1 - stackIndex * 0.25;
                    var blurAmount = stackIndex > 0 ? "".concat(stackIndex * 2, "px") : '0px';
                    var translateY = stackIndex * 24;
                    var style = {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: zIndex,
                        transform: "scale(".concat(scale, ") translateY(").concat(translateY, "px)"),
                        pointerEvents: isActive ? 'auto' : 'none',
                        opacity: isActive ? 1 : Math.max(0.3, opacity),
                        filter: isActive ? 'none' : "blur(".concat(blurAmount, ")"),
                        userSelect: isActive ? 'auto' : 'none',
                        transition: 'all 500ms ease-out',
                    };
                    return ((0, jsx_runtime_1.jsx)("div", { className: "relative w-full", style: style, children: (0, jsx_runtime_1.jsx)(StoryCard, { story: story, orgName: orgName, repoName: repoName, branch: branch, action: null, onAccept: handleAccept, onIgnore: handleIgnore }) }, story.id));
                }) }))] }));
}
function ZenBrushStroke() {
    return ((0, jsx_runtime_1.jsxs)("svg", { viewBox: "0 0 400 200", className: "w-full max-w-md text-muted-foreground/30", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [(0, jsx_runtime_1.jsx)("path", { d: "M 50 100 Q 100 50, 150 80 T 250 90 T 350 100", stroke: "currentColor", strokeWidth: "8", strokeLinecap: "round", strokeLinejoin: "round", fill: "none", opacity: "0.6" }), (0, jsx_runtime_1.jsx)("path", { d: "M 60 110 Q 110 60, 160 90 T 260 100 T 360 110", stroke: "currentColor", strokeWidth: "6", strokeLinecap: "round", strokeLinejoin: "round", fill: "none", opacity: "0.4" }), (0, jsx_runtime_1.jsx)("path", { d: "M 45 95 Q 95 45, 145 75 T 245 85 T 345 95", stroke: "currentColor", strokeWidth: "4", strokeLinecap: "round", strokeLinejoin: "round", fill: "none", opacity: "0.3" })] }));
}
function ShikiCodeBlock(_a) {
    var _this = this;
    var code = _a.code, language = _a.language, fileName = _a.fileName, githubUrl = _a.githubUrl;
    var _b = (0, react_1.useState)(''), html = _b[0], setHtml = _b[1];
    var _c = (0, react_1.useState)(true), isLoading = _c[0], setIsLoading = _c[1];
    (0, react_1.useEffect)(function () {
        var highlightCode = function () { return __awaiter(_this, void 0, void 0, function () {
            var highlighted, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, 3, 4]);
                        return [4 /*yield*/, (0, shiki_1.codeToHtml)(code, {
                                lang: language,
                                theme: 'github-light',
                            })];
                    case 1:
                        highlighted = _a.sent();
                        setHtml(highlighted);
                        return [3 /*break*/, 4];
                    case 2:
                        error_1 = _a.sent();
                        console.error('Failed to highlight code:', error_1);
                        setHtml("<pre><code>".concat(code, "</code></pre>"));
                        return [3 /*break*/, 4];
                    case 3:
                        setIsLoading(false);
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        void highlightCode();
    }, [code, language, fileName, githubUrl]);
    if (isLoading) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "shiki-container", children: [fileName && ((0, jsx_runtime_1.jsxs)("div", { className: "shiki-header", children: [(0, jsx_runtime_1.jsx)("span", { className: "shiki-file-name", children: fileName }), githubUrl && ((0, jsx_runtime_1.jsx)("a", { href: githubUrl, target: "_blank", rel: "noopener noreferrer", className: "shiki-header-link", children: "View on GitHub" }))] })), (0, jsx_runtime_1.jsx)("pre", { className: "shiki", children: (0, jsx_runtime_1.jsx)("code", { children: code }) })] }));
    }
    return ((0, jsx_runtime_1.jsx)("div", { className: "shiki-container", dangerouslySetInnerHTML: { __html: html } }));
}
function StoryCard(_a) {
    var story = _a.story, orgName = _a.orgName, repoName = _a.repoName, branch = _a.branch, action = _a.action, onAccept = _a.onAccept, onIgnore = _a.onIgnore;
    var _b = (0, react_1.useState)(story.summary), content = _b[0], setContent = _b[1];
    if (action !== null) {
        var isIgnored = action === 'ignored';
        return ((0, jsx_runtime_1.jsx)(card_1.Card, { className: "relative overflow-hidden border-border bg-card shadow-lg cursor-pointer hover:bg-card/90 transition-colors", children: (0, jsx_runtime_1.jsx)(card_1.CardContent, { children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-4", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-semibold text-foreground truncate flex-1 ".concat(isIgnored ? 'line-through text-muted-foreground' : ''), children: story.title }), !isIgnored && ((0, jsx_runtime_1.jsx)(button_1.Button, { asChild: true, variant: "ghost", size: "sm", className: "h-auto p-1 text-muted-foreground hover:text-foreground", onClick: function (e) { return e.stopPropagation(); }, children: (0, jsx_runtime_1.jsx)("a", { href: "/org/".concat(orgName, "/repo/").concat(repoName, "/stories/").concat(story.id), children: (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { className: "size-5" }) }) }))] }) }) }));
    }
    return ((0, jsx_runtime_1.jsx)(card_1.Card, { className: "relative overflow-hidden border-border bg-card shadow-lg", children: (0, jsx_runtime_1.jsxs)(card_1.CardContent, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-2 flex flex-wrap items-center gap-2 text-[11px] font-medium", children: [(0, jsx_runtime_1.jsx)(StoryStatusPill, { status: story.status }), (0, jsx_runtime_1.jsx)("span", { className: "inline-flex items-center rounded-full bg-muted px-2 py-[3px] text-[10px] font-medium text-muted-foreground", children: story.area })] }), (0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-semibold text-foreground", children: story.title }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-2 grid grid-cols-2 gap-4", children: [(0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsx)(tiptap_editor_1.TiptapEditor, { value: content, onChange: setContent, readOnly: false, className: "min-h-[100px]" }) }), (0, jsx_runtime_1.jsx)("div", { children: (function () {
                                var _a = story.evidence.split(':'), filePath = _a[0], lineRange = _a[1];
                                var lineAnchor = lineRange
                                    ? "#L".concat(lineRange.replace('-', '-L'))
                                    : '';
                                var githubUrl = "https://github.com/".concat(orgName, "/").concat(repoName, "/blob/").concat(branch, "/").concat(filePath).concat(lineAnchor);
                                return ((0, jsx_runtime_1.jsx)(ShikiCodeBlock, { code: "const email = localStorage.getItem('checkout-email')\nuseEffect(() => {\n  if (email) setEmail(email)\n}, [])", language: "typescript", fileName: filePath, githubUrl: githubUrl }));
                            })() })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-3 flex gap-2", children: [(0, jsx_runtime_1.jsx)(button_1.Button, { onClick: onAccept, size: "sm", variant: "default", children: "Accept" }), (0, jsx_runtime_1.jsx)(button_1.Button, { onClick: onIgnore, size: "sm", variant: "outline", children: "Ignore" })] })] }) }));
}
function StoryStatusPill(_a) {
    var status = _a.status;
    var label = status === 'new'
        ? 'New'
        : status === 'updated'
            ? 'Change'
            : status === 'at-risk'
                ? 'At risk'
                : 'Unchanged';
    var className = status === 'new'
        ? 'border-chart-1/40 bg-chart-1/15 text-chart-1'
        : status === 'updated'
            ? 'border-primary/40 bg-primary/15 text-primary'
            : status === 'at-risk'
                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                : 'border-border bg-muted text-muted-foreground';
    return ((0, jsx_runtime_1.jsx)("span", { className: "inline-flex items-center rounded-full border px-2 py-[3px] text-[10px] font-medium ".concat(className), children: label }));
}
