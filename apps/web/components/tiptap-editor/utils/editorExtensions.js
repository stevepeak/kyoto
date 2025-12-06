"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEditorExtensions = createEditorExtensions;
var starter_kit_1 = require("@tiptap/starter-kit");
var extension_placeholder_1 = require("@tiptap/extension-placeholder");
var extension_link_1 = require("@tiptap/extension-link");
var markdown_1 = require("@tiptap/markdown");
function createEditorExtensions(readOnly, placeholder) {
    var baseExtensions = [
        // Exclude Link from StarterKit since we're configuring our own
        starter_kit_1.default.configure({
            link: false,
        }),
        markdown_1.Markdown,
        extension_link_1.default.configure({
            openOnClick: false,
            HTMLAttributes: {
                class: 'text-primary underline',
            },
        }),
    ];
    // Only add placeholder extension when not read-only and placeholder is provided
    if (!readOnly && placeholder) {
        baseExtensions.push(extension_placeholder_1.default.configure({
            placeholder: placeholder,
        }));
    }
    return baseExtensions;
}
