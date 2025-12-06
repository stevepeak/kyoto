"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
var jsx_runtime_1 = require("react/jsx-runtime");
var google_1 = require("next/font/google");
var local_1 = require("next/font/local");
require("./globals.css");
var app_provider_1 = require("@/components/providers/app-provider");
var inter = (0, google_1.Inter)({ subsets: ['latin'], variable: '--font-inter' });
var manrope = (0, local_1.default)({
    src: [
        {
            path: '../public/fonts/manrope/Manrope-Regular.ttf',
            weight: '400',
            style: 'normal',
        },
        {
            path: '../public/fonts/manrope/Manrope-Medium.ttf',
            weight: '500',
            style: 'normal',
        },
        {
            path: '../public/fonts/manrope/Manrope-SemiBold.ttf',
            weight: '600',
            style: 'normal',
        },
        {
            path: '../public/fonts/manrope/Manrope-Bold.ttf',
            weight: '700',
            style: 'normal',
        },
    ],
    variable: '--font-manrope',
    display: 'swap',
    fallback: ['DM Sans', 'Inter', 'sans-serif'],
});
var cormorantGaramond = (0, local_1.default)({
    src: [
        {
            path: '../public/fonts/cormorant-garamond/CormorantGaramond-Regular.ttf',
            weight: '400',
            style: 'normal',
        },
        {
            path: '../public/fonts/cormorant-garamond/CormorantGaramond-Medium.ttf',
            weight: '500',
            style: 'normal',
        },
        {
            path: '../public/fonts/cormorant-garamond/CormorantGaramond-SemiBold.ttf',
            weight: '600',
            style: 'normal',
        },
    ],
    variable: '--font-cormorant',
    display: 'swap',
    fallback: ['Times New Roman', 'serif'],
});
exports.metadata = {
    title: 'Kyoto - Intent Testing',
    description: 'AI-powered QA',
    icons: {
        icon: '/favicon.svg',
    },
};
function RootLayout(_a) {
    var children = _a.children;
    return ((0, jsx_runtime_1.jsx)("html", { lang: "en", children: (0, jsx_runtime_1.jsx)("body", { className: "".concat(inter.variable, " ").concat(manrope.variable, " ").concat(cormorantGaramond.variable), children: (0, jsx_runtime_1.jsx)(app_provider_1.AppProvider, { children: children }) }) }));
}
