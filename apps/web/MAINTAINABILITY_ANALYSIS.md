# Maintainability Analysis: apps/web

## Executive Summary

This analysis identifies opportunities to improve maintainability and reduce code redundancy in `apps/web`. The main areas for improvement are:

1. **Loader Component Pattern** - 7+ loader components with nearly identical structure
2. **App Wrapper Components** - Redundant wrapper components that only add AppProvider
3. **Error Display** - Repeated error display pattern across components
4. **Breadcrumbs Construction** - Manual breadcrumb construction in multiple places
5. **Data Fetching Pattern** - Repeated `isMounted` cleanup pattern
6. **Type Definitions** - Duplicated type definitions across files

---

## 1. Loader Component Pattern (HIGH PRIORITY)

### Problem
All loader components follow the exact same pattern:
- `useState` for `isLoading`, data, and `error`
- `useEffect` with `isMounted` cleanup pattern
- Identical error handling logic
- Similar loading/error UI rendering

**Affected Files:**
- `repo-overview-loader.tsx`
- `repo-runs-loader.tsx`
- `repo-stories-loader.tsx`
- `story-detail-loader.tsx`
- `run-detail-loader.tsx`
- `story-create-loader.tsx`
- `org-repo-by-slug-loader.tsx`
- `org-list-app.tsx`

### Current Pattern (Repeated 7+ times)
```typescript
const [isLoading, setIsLoading] = useState(true)
const [data, setData] = useState<DataType | null>(null)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  let isMounted = true
  async function load() {
    try {
      const resp = await trpc.some.query({ ... })
      if (!isMounted) return
      setData(resp.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setIsLoading(false)
    }
  }
  void load()
  return () => { isMounted = false }
}, [dependencies])
```

### Recommendation
Create a reusable `useAsyncData` hook:

```typescript
// hooks/use-async-data.ts
export function useAsyncData<T>(
  queryFn: () => Promise<T>,
  dependencies: React.DependencyList
) {
  const [state, setState] = useState<{
    isLoading: boolean
    data: T | null
    error: string | null
  }>({
    isLoading: true,
    data: null,
    error: null,
  })

  useEffect(() => {
    let isMounted = true
    async function load() {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      try {
        const data = await queryFn()
        if (!isMounted) return
        setState({ isLoading: false, data, error: null })
      } catch (e) {
        if (!isMounted) return
        setState({
          isLoading: false,
          data: null,
          error: e instanceof Error ? e.message : 'Failed to load',
        })
      }
    }
    void load()
    return () => { isMounted = false }
  }, dependencies)

  return state
}
```

**Benefits:**
- Reduces ~50 lines per loader component
- Centralizes error handling logic
- Ensures consistent behavior across all loaders
- Easier to add features (retry, caching, etc.)

---

## 2. App Wrapper Components (MEDIUM PRIORITY)

### Problem
Multiple wrapper components that only add `AppProvider`, creating inconsistency:

**Affected Files:**
- `repo-app.tsx` - wraps `RepoOverviewLoader` with `AppProvider`
- `repo-runs-app.tsx` - wraps `RepoRunsLoader` with `AppProvider`
- `repo-stories-app.tsx` - wraps `RepoStoriesLoader` with `AppProvider`
- `setup-app-wrapper.tsx` - wraps `SetupApp` with `AppProvider`
- `setup-install-app-wrapper.tsx` - wraps `SetupInstallApp` with `AppProvider`

**Inconsistency:** Some loaders wrap themselves with `AppProvider` (e.g., `repo-overview-loader.tsx`, `org-repo-by-slug-loader.tsx`), while others rely on wrapper components.

### Current Pattern
```typescript
// Wrapper component
export function RepoApp({ orgSlug, repoName }: Props) {
  return (
    <AppProvider>
      <RepoOverviewLoader orgSlug={orgSlug} repoName={repoName} />
    </AppProvider>
  )
}

// vs. Loader that wraps itself
export function RepoOverviewLoader({ orgSlug, repoName }: Props) {
  // ... loading logic
  return (
    <AppProvider>
      {/* content */}
    </AppProvider>
  )
}
```

### Recommendation
**Standardize on one approach:**

**Option A:** Have all loaders wrap themselves with `AppProvider` and remove wrapper components
- Pros: Consistent, fewer files
- Cons: Loaders need to know about providers

**Option B:** Remove `AppProvider` from loaders and use wrapper components consistently
- Pros: Separation of concerns
- Cons: More files, but clearer separation

**Option C:** Create a generic wrapper HOC
```typescript
function withAppProvider<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WrappedComponent(props: P) {
    return (
      <AppProvider>
        <Component {...props} />
      </AppProvider>
    )
  }
}

export const RepoApp = withAppProvider(RepoOverviewLoader)
```

**Recommended:** Option A - Standardize on loaders wrapping themselves, eliminating wrapper components entirely.

---

## 3. Error Display Component (MEDIUM PRIORITY)

### Problem
Error display pattern repeated 6+ times:

```typescript
<div className="p-6 text-sm text-red-500">{error}</div>
```

**Affected Files:**
- `repo-overview-loader.tsx` (line 74)
- `repo-runs-loader.tsx` (line 59)
- `repo-stories-loader.tsx` (line 67)
- `story-detail-loader.tsx` (line 94)
- `run-detail-loader.tsx` (line 360)
- `org-repo-by-slug-loader.tsx` (line 97)

### Recommendation
Create a reusable `ErrorDisplay` component:

```typescript
// components/common/ErrorDisplay.tsx
export function ErrorDisplay({ 
  error, 
  className 
}: { 
  error: string | null
  className?: string 
}) {
  if (!error) return null
  return (
    <div className={cn("p-6 text-sm text-destructive", className)}>
      {error}
    </div>
  )
}
```

**Benefits:**
- Consistent error styling
- Easy to update error UI globally
- Can add features (retry button, error codes, etc.)

---

## 4. Breadcrumbs Construction (LOW PRIORITY)

### Problem
Breadcrumbs are manually constructed in multiple places with similar patterns:

**Affected Files:**
- `repo-runs-loader.tsx` (lines 51-54)
- `repo-stories-loader.tsx` (lines 59-62)
- `story-detail-loader.tsx` (lines 86-89)
- `run-detail-loader.tsx` (lines 352-355)
- `story-create-loader.tsx` (lines 120-123)
- `repo-overview.tsx` (line 67)
- `org-repo-dashboard.tsx` (line 225)

### Current Pattern
```typescript
breadcrumbs={[
  { label: orgSlug, href: `/org/${orgSlug}` },
  { label: repoName, href: `/org/${orgSlug}/repo/${repoName}` },
]}
```

### Recommendation
Create helper functions for common breadcrumb patterns:

```typescript
// lib/breadcrumbs.ts
export function createOrgBreadcrumbs(orgSlug: string): BreadcrumbItem[] {
  return [{ label: orgSlug, href: `/org/${orgSlug}` }]
}

export function createRepoBreadcrumbs(
  orgSlug: string, 
  repoName: string
): BreadcrumbItem[] {
  return [
    ...createOrgBreadcrumbs(orgSlug),
    { label: repoName, href: `/org/${orgSlug}/repo/${repoName}` }
  ]
}

export function createStoryBreadcrumbs(
  orgSlug: string,
  repoName: string,
  storyName?: string
): BreadcrumbItem[] {
  return [
    ...createRepoBreadcrumbs(orgSlug, repoName),
    ...(storyName ? [{ label: storyName, href: '#' }] : [])
  ]
}
```

**Benefits:**
- Reduces duplication
- Ensures consistent URLs
- Easier to update URL structure globally

---

## 5. Type Definitions (LOW PRIORITY)

### Problem
Similar type definitions duplicated across files:

**Examples:**
- `RunItem` defined in `repo-runs-loader.tsx` and `repo-overview-loader.tsx`
- `StoryItem` defined in `repo-stories-loader.tsx` and `repo-overview-loader.tsx`
- Status types (`'pass' | 'fail' | 'running' | 'error'`) repeated multiple times

### Recommendation
Create shared type definitions:

```typescript
// types/runs.ts
export type RunStatus = 'queued' | 'running' | 'success' | 'failed' | 'error'
export interface RunItem {
  id: string
  runId: string
  status: RunStatus
  createdAt: string
  commitSha: string
}

// types/stories.ts
export type StoryStatus = 'pass' | 'fail' | 'error' | 'running' | null
export interface StoryItem {
  id: string
  name: string
  story: string
  commitSha: string | null
  branchName: string
  createdAt: string | null
  updatedAt: string | null
  groups: string[]
  latestStatus: StoryStatus
  latestStatusAt: string | null
}
```

**Benefits:**
- Single source of truth for types
- Easier refactoring
- Better type safety

---

## 6. Loading State Component (LOW PRIORITY)

### Problem
Loading states are handled inconsistently:
- Some use `LoadingProgress` component
- Some use conditional rendering with `isLoading`
- Error states mixed with loading states

### Recommendation
Create a `DataLoader` component that handles loading/error/data states:

```typescript
// components/common/DataLoader.tsx
interface DataLoaderProps<T> {
  isLoading: boolean
  error: string | null
  data: T | null
  loadingLabel?: string
  children: (data: T) => React.ReactNode
  errorComponent?: (error: string) => React.ReactNode
}

export function DataLoader<T>({
  isLoading,
  error,
  data,
  loadingLabel = 'Loading...',
  children,
  errorComponent,
}: DataLoaderProps<T>) {
  if (isLoading) {
    return <LoadingProgress label={loadingLabel} />
  }
  
  if (error) {
    return errorComponent ? (
      errorComponent(error)
    ) : (
      <ErrorDisplay error={error} />
    )
  }
  
  if (!data) {
    return null
  }
  
  return <>{children(data)}</>
}
```

**Usage:**
```typescript
<DataLoader
  isLoading={isLoading}
  error={error}
  data={repo}
  loadingLabel="Loading repository..."
>
  {(repo) => <RepoOverview repo={repo} />}
</DataLoader>
```

---

## 7. tRPC Client Usage Pattern (LOW PRIORITY)

### Problem
`useTRPCClient()` is called in every loader component (24+ usages). While this is necessary, the pattern could be simplified if combined with the `useAsyncData` hook.

### Current Pattern
```typescript
const trpc = useTRPCClient()
const [isLoading, setIsLoading] = useState(true)
// ... rest of loading logic
```

### Recommendation
When implementing `useAsyncData`, consider creating a specialized `useTrpcQuery` hook:

```typescript
// hooks/use-trpc-query.ts
export function useTrpcQuery<TData, TInput>(
  query: (trpc: ReturnType<typeof useTRPCClient>) => (input: TInput) => Promise<TData>,
  input: TInput,
  options?: { enabled?: boolean }
) {
  const trpc = useTRPCClient()
  return useAsyncData(
    () => query(trpc)(input),
    [trpc, input, options?.enabled]
  )
}
```

This would further simplify loader components, though it's optional if `useAsyncData` is implemented.

---

## 8. API Route Error Handling (LOW PRIORITY)

### Problem
Similar error handling pattern in API routes:

**Affected Files:**
- `api/github/app/callback.ts` (lines 150-159)
- `api/github/webhook.ts` (lines 114-123)

### Current Pattern
```typescript
catch (error) {
  console.error('Failed to...', error)
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  const errorDetails = import.meta.env.DEV ? errorMessage : undefined
  return new Response(
    `Failed to...${errorDetails ? `: ${errorDetails}` : ''}`,
    { status: 500 }
  )
}
```

### Recommendation
Create a helper function:

```typescript
// server/api-helpers.ts
export function handleApiError(
  error: unknown,
  context: string
): Response {
  console.error(`Failed to ${context}:`, error)
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  const errorDetails = import.meta.env.DEV ? errorMessage : undefined
  return new Response(
    `Failed to ${context}${errorDetails ? `: ${errorDetails}` : ''}`,
    { status: 500 }
  )
}
```

---

## Implementation Priority

1. **HIGH:** Create `useAsyncData` hook (affects 7+ files, ~350 lines saved)
   - **Impact:** Eliminates most boilerplate in loader components
   - **Effort:** Medium (need to test thoroughly)
   
2. **MEDIUM:** Create `ErrorDisplay` component (affects 6+ files)
   - **Impact:** Consistent error UI, easier to update globally
   - **Effort:** Low (simple component)
   
3. **MEDIUM:** Standardize `AppProvider` usage (affects 5+ wrapper files)
   - **Impact:** Removes redundant wrapper components, improves consistency
   - **Effort:** Low-Medium (need to update all loaders consistently)
   
4. **LOW:** Create breadcrumb helpers (affects 7+ files)
   - **Impact:** Reduces duplication, ensures URL consistency
   - **Effort:** Low (simple utility functions)
   
5. **LOW:** Consolidate type definitions (affects multiple files)
   - **Impact:** Single source of truth for types
   - **Effort:** Low (create shared type files)
   
6. **LOW:** Create `DataLoader` component (nice-to-have)
   - **Impact:** Cleaner component code, consistent loading/error states
   - **Effort:** Medium (needs careful design)
   
7. **LOW:** Create `useTrpcQuery` hook (optional enhancement)
   - **Impact:** Further simplifies loader components
   - **Effort:** Low (builds on `useAsyncData`)
   
8. **LOW:** Create API error helper (affects 2+ files)
   - **Impact:** Consistent error handling in API routes
   - **Effort:** Low (simple utility function)

---

## Estimated Impact

- **Lines of Code Reduction:** ~500-700 lines
- **Files Affected:** 20+ files
- **Maintainability:** Significantly improved
- **Consistency:** Much more consistent patterns
- **Testing:** Easier to test shared utilities

---

## Notes

- All recommendations maintain backward compatibility
- Changes can be implemented incrementally
- No breaking changes to public APIs
- Follows existing code patterns and conventions
