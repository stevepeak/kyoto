"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRepoSearch = useRepoSearch;
var react_1 = require("react");
function useRepoSearch(allRepos, searchQuery, orgSlug) {
    var filteredRepos = (0, react_1.useMemo)(function () {
        return allRepos.filter(function (repo) {
            if (!searchQuery.trim()) {
                return !repo.enabled;
            }
            var query = searchQuery.toLowerCase();
            return (!repo.enabled &&
                (repo.name.toLowerCase().includes(query) ||
                    "".concat(orgSlug, "/").concat(repo.name).toLowerCase().includes(query)));
        });
    }, [allRepos, searchQuery, orgSlug]);
    return filteredRepos;
}
