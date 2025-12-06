"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgPage = OrgPage;
var jsx_runtime_1 = require("react/jsx-runtime");
var org_repo_by_slug_loader_1 = require("@/components/features/repos/org-repo-by-slug-loader");
function OrgPage(_a) {
    var orgName = _a.orgName;
    return (0, jsx_runtime_1.jsx)(org_repo_by_slug_loader_1.OrgRepoBySlugLoader, { orgName: orgName });
}
