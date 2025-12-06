"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyboardShortcutHint = KeyboardShortcutHint;
var jsx_runtime_1 = require("react/jsx-runtime");
var use_is_mac_1 = require("@/hooks/use-is-mac");
/**
 * Component that displays keyboard shortcut hint (⌘ or Ctrl)
 * Safe for SSR - uses hook that prevents hydration mismatches
 */
function KeyboardShortcutHint() {
    var isMac = (0, use_is_mac_1.useIsMac)();
    return ((0, jsx_runtime_1.jsxs)("span", { className: "ml-2 text-xs opacity-60", children: [isMac ? '⌘' : 'Ctrl', "+Enter"] }));
}
