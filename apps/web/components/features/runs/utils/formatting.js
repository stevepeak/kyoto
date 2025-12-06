"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = formatDate;
exports.formatRelativeTime = formatRelativeTime;
exports.formatDurationMs = formatDurationMs;
exports.getCommitTitle = getCommitTitle;
exports.getShortSha = getShortSha;
function formatDate(dateString) {
    var date = new Date(dateString);
    // Use a consistent locale to prevent hydration mismatches
    // en-US is a safe default that works on both server and client
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}
function formatRelativeTime(dateString) {
    var date = new Date(dateString);
    var now = new Date();
    var diffMs = now.getTime() - date.getTime();
    var diffMins = Math.floor(diffMs / 60000);
    var diffHours = Math.floor(diffMs / 3600000);
    var diffDays = Math.floor(diffMs / 86400000);
    var diffWeeks = Math.floor(diffDays / 7);
    if (diffMins < 1) {
        return 'just now';
    }
    if (diffMins < 60) {
        return "".concat(diffMins, " minute").concat(diffMins === 1 ? '' : 's', " ago");
    }
    if (diffHours < 24) {
        return "".concat(diffHours, " hour").concat(diffHours === 1 ? '' : 's', " ago");
    }
    if (diffDays < 7) {
        return "".concat(diffDays, " day").concat(diffDays === 1 ? '' : 's', " ago");
    }
    if (diffWeeks < 5) {
        return "".concat(diffWeeks, " week").concat(diffWeeks === 1 ? '' : 's', " ago");
    }
    // Use a consistent locale to prevent hydration mismatches
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}
function formatDurationMs(durationMs) {
    if (!durationMs || durationMs < 1) {
        return '—';
    }
    if (durationMs < 1000) {
        return "".concat(durationMs, "ms");
    }
    if (durationMs < 60000) {
        return "".concat(Math.round(durationMs / 1000), "s");
    }
    var minutes = Math.floor(durationMs / 60000);
    var seconds = Math.round((durationMs % 60000) / 1000);
    if (minutes < 60) {
        return seconds > 0 ? "".concat(minutes, "m ").concat(seconds, "s") : "".concat(minutes, "m");
    }
    var hours = Math.floor(minutes / 60);
    var remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? "".concat(hours, "h ").concat(remainingMinutes, "m") : "".concat(hours, "h");
}
/**
 * Extracts the first line of a commit message, with optional fallback.
 */
function getCommitTitle(commitMessage, fallback) {
    var _a;
    if (fallback === void 0) { fallback = 'No commit message'; }
    return ((_a = commitMessage === null || commitMessage === void 0 ? void 0 : commitMessage.split('\n')[0]) === null || _a === void 0 ? void 0 : _a.trim()) || fallback;
}
/**
 * Formats a commit SHA to short format (first 7 characters).
 */
function getShortSha(commitSha, fallback) {
    if (fallback === void 0) { fallback = null; }
    return commitSha ? commitSha.slice(0, 7) : fallback;
}
