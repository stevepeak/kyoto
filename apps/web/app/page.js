"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revalidate = exports.dynamic = void 0;
exports.default = HomePage;
var jsx_runtime_1 = require("react/jsx-runtime");
var landing_1 = require("@/components/landing");
// Landing page can be statically generated and cached
exports.dynamic = 'force-static';
exports.revalidate = 3600; // Revalidate every hour
function HomePage() {
    return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(landing_1.LandingNavbar, {}), (0, jsx_runtime_1.jsx)(landing_1.LandingHero, {}), (0, jsx_runtime_1.jsx)(landing_1.FeatureGrid, {}), (0, jsx_runtime_1.jsx)(landing_1.Metrics, {}), (0, jsx_runtime_1.jsx)(landing_1.Testimonials, {}), (0, jsx_runtime_1.jsx)(landing_1.Pricing, {}), (0, jsx_runtime_1.jsx)(landing_1.Faq, {}), (0, jsx_runtime_1.jsx)(landing_1.LandingFooter, {})] }));
}
