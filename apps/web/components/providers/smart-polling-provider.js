'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartPollingProvider = SmartPollingProvider;
var jsx_runtime_1 = require("react/jsx-runtime");
var use_smart_polling_1 = require("@/hooks/use-smart-polling");
/**
 * Provider component that wraps the app with smart polling context
 */
function SmartPollingProvider(_a) {
    var children = _a.children;
    var contextValue = (0, use_smart_polling_1.useSmartPollingProvider)();
    return ((0, jsx_runtime_1.jsx)(use_smart_polling_1.SmartPollingContext.Provider, { value: contextValue, children: children }));
}
