import { useMemo } from 'react'

interface DialogRepoItem {
  id: string
  name: string
  defaultBranch: string | null
  enabled: boolean
  isPrivate: boolean
}

export function useRepoSearch(
  allRepos: DialogRepoItem[],
  searchQuery: string,
  orgSlug?: string,
) {
  const filteredRepos = useMemo(() => {
    return allRepos.filter((repo) => {
      if (!searchQuery.trim()) {
        return !repo.enabled
      }
      const query = searchQuery.toLowerCase()
      return (
        !repo.enabled &&
        (repo.name.toLowerCase().includes(query) ||
          `${orgSlug}/${repo.name}`.toLowerCase().includes(query))
      )
    })
  }, [allRepos, searchQuery, orgSlug])

  return filteredRepos
}
