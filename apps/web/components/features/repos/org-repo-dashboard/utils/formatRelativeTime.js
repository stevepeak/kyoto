"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatRelativeTime = formatRelativeTime;
function formatRelativeTime(value) {
    if (!value) {
        return null;
    }
    var rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    var deltaSeconds = Math.round((value.getTime() - Date.now()) / 1000);
    var units = [
        { limit: 60, divisor: 1, unit: 'second' },
        { limit: 3600, divisor: 60, unit: 'minute' },
        { limit: 86400, divisor: 3600, unit: 'hour' },
        { limit: 604800, divisor: 86400, unit: 'day' },
        { limit: 2629800, divisor: 604800, unit: 'week' },
        { limit: 31557600, divisor: 2629800, unit: 'month' },
    ];
    for (var _i = 0, units_1 = units; _i < units_1.length; _i++) {
        var _a = units_1[_i], limit = _a.limit, divisor = _a.divisor, unit = _a.unit;
        if (Math.abs(deltaSeconds) < limit) {
            return rtf.format(Math.round(deltaSeconds / divisor), unit);
        }
    }
    return rtf.format(Math.round(deltaSeconds / 31557600), 'year');
}
