'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.useRepoSearch = useRepoSearch
const react_1 = require('react')
function useRepoSearch(allRepos, searchQuery, orgSlug) {
  const filteredRepos = (0, react_1.useMemo)(
    function () {
      return allRepos.filter(function (repo) {
        if (!searchQuery.trim()) {
          return !repo.enabled
        }
        const query = searchQuery.toLowerCase()
        return (
          !repo.enabled &&
          (repo.name.toLowerCase().includes(query) ||
            ''
              .concat(orgSlug, '/')
              .concat(repo.name)
              .toLowerCase()
              .includes(query))
        )
      })
    },
    [allRepos, searchQuery, orgSlug],
  )
  return filteredRepos
}
