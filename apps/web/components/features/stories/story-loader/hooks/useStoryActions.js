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
exports.useStoryActions = useStoryActions;
var navigation_1 = require("next/navigation");
var sonner_1 = require("sonner");
var trpc_1 = require("@/client/trpc");
function useStoryActions(_a) {
    var _this = this;
    var orgName = _a.orgName, repoName = _a.repoName, storyId = _a.storyId, isCreateMode = _a.isCreateMode, storyName = _a.storyName, storyContent = _a.storyContent, originalStoryContent = _a.originalStoryContent, originalStoryName = _a.originalStoryName, hasContentChanges = _a.hasContentChanges, hasNameChanges = _a.hasNameChanges, createMore = _a.createMore, setStory = _a.setStory, setStoryName = _a.setStoryName, setStoryContent = _a.setStoryContent, setOriginalStoryContent = _a.setOriginalStoryContent, setOriginalStoryName = _a.setOriginalStoryName, _setCreateMore = _a.setCreateMore, setError = _a.setError, setIsSaving = _a.setIsSaving, setIsArchiving = _a.setIsArchiving, setIsTogglingState = _a.setIsTogglingState, setIsDecomposing = _a.setIsDecomposing, setIsTesting = _a.setIsTesting, setIsGenerating = _a.setIsGenerating, setGenerationRunId = _a.setGenerationRunId, setGenerationAccessToken = _a.setGenerationAccessToken;
    var trpc = (0, trpc_1.useTRPCClient)();
    var router = (0, navigation_1.useRouter)();
    var handleSave = function () { return __awaiter(_this, void 0, void 0, function () {
        var updatePayload, result, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!storyContent.trim()) {
                        setError('Story content is required');
                        return [2 /*return*/];
                    }
                    setIsSaving(true);
                    setError(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    if (!isCreateMode) return [3 /*break*/, 3];
                    return [4 /*yield*/, trpc.story.create.mutate({
                            orgName: orgName,
                            repoName: repoName,
                            name: storyName.trim() || undefined,
                            story: storyContent,
                        })];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 3:
                    // Build update payload with only changed fields
                    if (!storyId) {
                        return [2 /*return*/];
                    }
                    updatePayload = {
                        orgName: orgName,
                        repoName: repoName,
                        storyId: storyId,
                    };
                    // Only include fields that have changed
                    if (hasNameChanges) {
                        updatePayload.name = storyName;
                    }
                    if (hasContentChanges) {
                        updatePayload.story = storyContent;
                    }
                    return [4 /*yield*/, trpc.story.update.mutate(updatePayload)];
                case 4:
                    result = _a.sent();
                    setStory(result.story);
                    setOriginalStoryContent(storyContent);
                    setOriginalStoryName(storyName);
                    setIsSaving(false);
                    return [2 /*return*/];
                case 5:
                    // If "create more" is checked, reset the form and stay on the page
                    if (createMore) {
                        setStoryContent('');
                        setStoryName('');
                        setOriginalStoryContent('');
                        setOriginalStoryName('');
                        setIsSaving(false);
                        sonner_1.toast.success('Story created.');
                        return [2 /*return*/]; // Early return to prevent any navigation
                    }
                    // Otherwise, navigate back to the repository page
                    router.push("/org/".concat(orgName, "/repo/").concat(repoName));
                    return [3 /*break*/, 7];
                case 6:
                    e_1 = _a.sent();
                    setError(e_1 instanceof Error
                        ? e_1.message
                        : isCreateMode
                            ? 'Failed to create story'
                            : 'Failed to update story');
                    setIsSaving(false);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    var handleGenerate = function () { return __awaiter(_this, void 0, void 0, function () {
        var result, e_2;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!isCreateMode) {
                        return [2 /*return*/]; // Only allow generation in create mode
                    }
                    setIsGenerating(true);
                    setError(null);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, trpc.story.generate.mutate({
                            orgName: orgName,
                            repoName: repoName,
                        })];
                case 2:
                    result = _c.sent();
                    if (((_a = result.triggerHandle) === null || _a === void 0 ? void 0 : _a.publicAccessToken) && ((_b = result.triggerHandle) === null || _b === void 0 ? void 0 : _b.id)) {
                        // Set the run ID and token to enable the hook
                        setGenerationRunId(result.triggerHandle.id);
                        setGenerationAccessToken(result.triggerHandle.publicAccessToken);
                        // Keep isGenerating true while run is in progress
                    }
                    else {
                        throw new Error('Failed to get trigger handle');
                    }
                    return [3 /*break*/, 4];
                case 3:
                    e_2 = _c.sent();
                    setError(e_2 instanceof Error
                        ? e_2.message
                        : 'Failed to generate story. Please try again.');
                    sonner_1.toast.error('Failed to generate story');
                    setIsGenerating(false);
                    setGenerationRunId(null);
                    setGenerationAccessToken(null);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleCancel = function () {
        if (isCreateMode) {
            // Don't clear draft on cancel - user might come back
            window.history.back();
        }
        else {
            setStoryContent(originalStoryContent);
            setStoryName(originalStoryName);
        }
    };
    var handleArchive = function () { return __awaiter(_this, void 0, void 0, function () {
        var e_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!storyId) {
                        return [2 /*return*/];
                    }
                    setIsArchiving(true);
                    setError(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, trpc.story.toggleState.mutate({
                            orgName: orgName,
                            repoName: repoName,
                            storyId: storyId,
                            state: 'archived',
                        })];
                case 2:
                    _a.sent();
                    router.push("/org/".concat(orgName, "/repo/").concat(repoName));
                    return [3 /*break*/, 4];
                case 3:
                    e_3 = _a.sent();
                    setError(e_3 instanceof Error ? e_3.message : 'Failed to archive story');
                    setIsArchiving(false);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleToggleState = function (newState) { return __awaiter(_this, void 0, void 0, function () {
        var result, e_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!storyId) {
                        return [2 /*return*/];
                    }
                    setIsTogglingState(true);
                    setError(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, trpc.story.toggleState.mutate({
                            orgName: orgName,
                            repoName: repoName,
                            storyId: storyId,
                            state: newState,
                        })];
                case 2:
                    result = _a.sent();
                    if (result.story) {
                        setStory(result.story);
                    }
                    return [3 /*break*/, 5];
                case 3:
                    e_4 = _a.sent();
                    setError(e_4 instanceof Error ? e_4.message : 'Failed to toggle story state');
                    return [3 /*break*/, 5];
                case 4:
                    setIsTogglingState(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleDecompose = function () { return __awaiter(_this, void 0, void 0, function () {
        var resp, e_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!storyId) {
                        return [2 /*return*/];
                    }
                    setIsDecomposing(true);
                    setError(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, trpc.story.decompose.mutate({
                            storyId: storyId,
                        })
                        // Reload story to get updated decomposition
                    ];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, trpc.story.get.query({
                            orgName: orgName,
                            repoName: repoName,
                            storyId: storyId,
                        })];
                case 3:
                    resp = _a.sent();
                    if (resp.story) {
                        setStory(resp.story);
                        setStoryName(resp.story.name);
                        setOriginalStoryName(resp.story.name);
                        setStoryContent(resp.story.story);
                        setOriginalStoryContent(resp.story.story);
                    }
                    return [3 /*break*/, 6];
                case 4:
                    e_5 = _a.sent();
                    setError(e_5 instanceof Error ? e_5.message : 'Failed to start decomposition');
                    return [3 /*break*/, 6];
                case 5:
                    setIsDecomposing(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    var handleTest = function () { return __awaiter(_this, void 0, void 0, function () {
        var e_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!storyId) {
                        return [2 /*return*/];
                    }
                    setIsTesting(true);
                    setError(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, trpc.story.test.mutate({
                            storyId: storyId,
                        })];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 3:
                    e_6 = _a.sent();
                    setError(e_6 instanceof Error ? e_6.message : 'Failed to start test');
                    return [3 /*break*/, 5];
                case 4:
                    setIsTesting(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleApproveGenerated = function () { return __awaiter(_this, void 0, void 0, function () {
        var e_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!storyId) {
                        return [2 /*return*/];
                    }
                    setIsDecomposing(true);
                    setError(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    // Trigger decomposition workflow
                    return [4 /*yield*/, trpc.story.decompose.mutate({
                            storyId: storyId,
                        })
                        // Navigate back to repos page
                    ];
                case 2:
                    // Trigger decomposition workflow
                    _a.sent();
                    // Navigate back to repos page
                    router.push("/org/".concat(orgName, "/repo/").concat(repoName));
                    return [3 /*break*/, 4];
                case 3:
                    e_7 = _a.sent();
                    setError(e_7 instanceof Error ? e_7.message : 'Failed to approve story');
                    setIsDecomposing(false);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    return {
        handleSave: handleSave,
        handleGenerate: handleGenerate,
        handleCancel: handleCancel,
        handleArchive: handleArchive,
        handleToggleState: handleToggleState,
        handleDecompose: handleDecompose,
        handleTest: handleTest,
        handleApproveGenerated: handleApproveGenerated,
    };
}
