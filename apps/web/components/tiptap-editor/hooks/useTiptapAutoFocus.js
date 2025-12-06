"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTiptapAutoFocus = useTiptapAutoFocus;
var react_1 = require("react");
function useTiptapAutoFocus(_a) {
    var editor = _a.editor, autoFocus = _a.autoFocus, readOnly = _a.readOnly;
    (0, react_1.useEffect)(function () {
        if (editor && autoFocus && !readOnly) {
            // Use setTimeout to ensure the editor is fully rendered
            var timeoutId_1 = setTimeout(function () {
                editor.commands.focus();
            }, 100);
            return function () { return clearTimeout(timeoutId_1); };
        }
    }, [editor, autoFocus, readOnly]);
}
