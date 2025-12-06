"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStoryLoaderState = useStoryLoaderState;
var react_1 = require("react");
function useStoryLoaderState(_a) {
    var _b, _c, _d, _e;
    var initialStory = _a.initialStory;
    // Error state
    var _f = (0, react_1.useState)(null), error = _f[0], setError = _f[1];
    // Story data states - initialize from server data if available
    var _g = (0, react_1.useState)(initialStory !== null && initialStory !== void 0 ? initialStory : null), story = _g[0], setStory = _g[1];
    // Story form state
    var _h = (0, react_1.useState)((_b = initialStory === null || initialStory === void 0 ? void 0 : initialStory.name) !== null && _b !== void 0 ? _b : ''), storyName = _h[0], setStoryName = _h[1];
    var _j = (0, react_1.useState)((_c = initialStory === null || initialStory === void 0 ? void 0 : initialStory.story) !== null && _c !== void 0 ? _c : ''), storyContent = _j[0], setStoryContent = _j[1];
    var _k = (0, react_1.useState)((_d = initialStory === null || initialStory === void 0 ? void 0 : initialStory.story) !== null && _d !== void 0 ? _d : ''), originalStoryContent = _k[0], setOriginalStoryContent = _k[1];
    var _l = (0, react_1.useState)((_e = initialStory === null || initialStory === void 0 ? void 0 : initialStory.name) !== null && _e !== void 0 ? _e : ''), originalStoryName = _l[0], setOriginalStoryName = _l[1];
    // UI state (dialogs and flags)
    var _m = (0, react_1.useState)(false), showArchiveDialog = _m[0], setShowArchiveDialog = _m[1];
    var _o = (0, react_1.useState)(false), showTemplatesDialog = _o[0], setShowTemplatesDialog = _o[1];
    var _p = (0, react_1.useState)(false), createMore = _p[0], setCreateMore = _p[1];
    // Action states
    var _q = (0, react_1.useState)(false), isSaving = _q[0], setIsSaving = _q[1];
    var _r = (0, react_1.useState)(false), isArchiving = _r[0], setIsArchiving = _r[1];
    var _s = (0, react_1.useState)(false), isTogglingState = _s[0], setIsTogglingState = _s[1];
    var _t = (0, react_1.useState)(false), isDecomposing = _t[0], setIsDecomposing = _t[1];
    var _u = (0, react_1.useState)(false), isTesting = _u[0], setIsTesting = _u[1];
    var _v = (0, react_1.useState)(false), isGenerating = _v[0], setIsGenerating = _v[1];
    var _w = (0, react_1.useState)(null), generationRunId = _w[0], setGenerationRunId = _w[1];
    var _x = (0, react_1.useState)(null), generationAccessToken = _x[0], setGenerationAccessToken = _x[1];
    // Derived values
    var hasContentChanges = storyContent !== originalStoryContent;
    var hasNameChanges = storyName !== originalStoryName;
    var hasChanges = hasContentChanges || hasNameChanges;
    // Update form state when initialStory changes (from server)
    (0, react_1.useEffect)(function () {
        if (initialStory) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing server data to form state
            setStory(initialStory);
            setStoryName(initialStory.name);
            setOriginalStoryName(initialStory.name);
            setStoryContent(initialStory.story);
            setOriginalStoryContent(initialStory.story);
        }
    }, [initialStory]);
    return {
        // Error state
        error: error,
        setError: setError,
        // Story data
        story: story,
        setStory: setStory,
        // Form state
        storyName: storyName,
        setStoryName: setStoryName,
        storyContent: storyContent,
        setStoryContent: setStoryContent,
        originalStoryContent: originalStoryContent,
        setOriginalStoryContent: setOriginalStoryContent,
        originalStoryName: originalStoryName,
        setOriginalStoryName: setOriginalStoryName,
        // UI state
        showArchiveDialog: showArchiveDialog,
        setShowArchiveDialog: setShowArchiveDialog,
        showTemplatesDialog: showTemplatesDialog,
        setShowTemplatesDialog: setShowTemplatesDialog,
        createMore: createMore,
        setCreateMore: setCreateMore,
        // Action states
        isSaving: isSaving,
        setIsSaving: setIsSaving,
        isArchiving: isArchiving,
        setIsArchiving: setIsArchiving,
        isTogglingState: isTogglingState,
        setIsTogglingState: setIsTogglingState,
        isDecomposing: isDecomposing,
        setIsDecomposing: setIsDecomposing,
        isTesting: isTesting,
        setIsTesting: setIsTesting,
        isGenerating: isGenerating,
        setIsGenerating: setIsGenerating,
        generationRunId: generationRunId,
        setGenerationRunId: setGenerationRunId,
        generationAccessToken: generationAccessToken,
        setGenerationAccessToken: setGenerationAccessToken,
        // Derived values
        hasContentChanges: hasContentChanges,
        hasNameChanges: hasNameChanges,
        hasChanges: hasChanges,
    };
}
