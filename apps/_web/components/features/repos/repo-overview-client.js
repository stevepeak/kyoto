'use client'
'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.RepoOverviewClient = RepoOverviewClient
const navigation_1 = require('next/navigation')
const jsx_runtime_1 = require('react/jsx-runtime')

const repo_overview_1 = require('./repo-overview')
/**
 * Client component wrapper for RepoOverview that handles refresh functionality
 */
function RepoOverviewClient(_a) {
  const orgName = _a.orgName,
    repoName = _a.repoName,
    defaultBranch = _a.defaultBranch,
    runs = _a.runs,
    stories = _a.stories
  const router = (0, navigation_1.useRouter)()
  const handleRefreshRuns = function () {
    // Refresh the server component data
    router.refresh()
  }
  const handleRefreshStories = function () {
    // Refresh the server component data
    router.refresh()
  }
  return (0, jsx_runtime_1.jsx)(repo_overview_1.RepoOverview, {
    orgName,
    repoName,
    defaultBranch,
    runs,
    stories,
    onRefreshRuns: handleRefreshRuns,
    onRefreshStories: handleRefreshStories,
  })
}
