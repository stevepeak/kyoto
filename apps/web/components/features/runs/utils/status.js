"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStatusDisplay = getStatusDisplay;
exports.getRunStatusDescriptor = getRunStatusDescriptor;
exports.getDisplayStatus = getDisplayStatus;
exports.getStoryTimestamps = getStoryTimestamps;
var lucide_react_1 = require("lucide-react");
function getStatusDisplay(status) {
    switch (status) {
        case 'pass':
            return {
                label: 'Succeeded',
                Icon: lucide_react_1.CheckCircle2,
                heroClassName: 'text-chart-1',
                chipClassName: 'border-chart-1/30 bg-chart-1/10 text-chart-1',
                chipIconClassName: 'text-chart-1',
                shouldSpin: false,
            };
        case 'fail':
            return {
                label: 'Failed',
                Icon: lucide_react_1.XCircle,
                heroClassName: 'text-destructive',
                chipClassName: 'border-destructive/30 bg-destructive/10 text-destructive',
                chipIconClassName: 'text-destructive',
                shouldSpin: false,
            };
        case 'skipped':
            return {
                label: 'Skipped',
                Icon: lucide_react_1.MinusCircle,
                heroClassName: 'text-muted-foreground',
                chipClassName: 'border-border bg-muted text-muted-foreground',
                chipIconClassName: 'text-muted-foreground',
                shouldSpin: false,
            };
        case 'running':
            return {
                label: 'In progress',
                Icon: lucide_react_1.Loader2,
                heroClassName: 'text-primary',
                chipClassName: 'border-primary/30 bg-primary/10 text-primary',
                chipIconClassName: 'text-primary',
                shouldSpin: true,
            };
        case 'error':
            return {
                label: 'Error',
                Icon: lucide_react_1.AlertTriangle,
                heroClassName: 'text-orange-600',
                chipClassName: 'border-orange-500/30 bg-orange-500/10 text-orange-600',
                chipIconClassName: 'text-orange-600',
                shouldSpin: false,
            };
    }
}
function getRunStatusDescriptor(status) {
    switch (status) {
        case 'pass':
            return 'passed';
        case 'fail':
            return 'failed';
        case 'skipped':
            return 'skipped';
        case 'running':
            return 'running';
        case 'error':
            return 'errored';
    }
}
function getDisplayStatus(story) {
    var _a, _b;
    return (_b = (_a = story.testResult) === null || _a === void 0 ? void 0 : _a.status) !== null && _b !== void 0 ? _b : story.status;
}
function getStoryTimestamps(story) {
    var _a, _b, _c;
    var testResult = story.testResult;
    return {
        startedAt: (_a = testResult === null || testResult === void 0 ? void 0 : testResult.startedAt) !== null && _a !== void 0 ? _a : story.startedAt,
        completedAt: (_b = testResult === null || testResult === void 0 ? void 0 : testResult.completedAt) !== null && _b !== void 0 ? _b : story.completedAt,
        durationMs: (_c = testResult === null || testResult === void 0 ? void 0 : testResult.durationMs) !== null && _c !== void 0 ? _c : ((testResult === null || testResult === void 0 ? void 0 : testResult.startedAt) && (testResult === null || testResult === void 0 ? void 0 : testResult.completedAt)
            ? new Date(testResult.completedAt).getTime() -
                new Date(testResult.startedAt).getTime()
            : story.startedAt && story.completedAt
                ? new Date(story.completedAt).getTime() -
                    new Date(story.startedAt).getTime()
                : null),
    };
}
