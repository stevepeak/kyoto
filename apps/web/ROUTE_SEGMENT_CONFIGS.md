# Route Segment Config Recommendations

## Landing/Marketing Pages (Static)

**Files:** `app/page.tsx`, `app/auth/page.tsx`

```typescript
export const dynamic = 'force-static'
export const revalidate = 3600 // 1 hour
```

**Why:** These pages don't change often and benefit from static generation for performance and SEO.

---

## App Pages (Always Dynamic)

**Files:**

- `app/app/page.tsx`
- `app/org/[slug]/page.tsx`
- `app/org/[slug]/repo/[repoName]/page.tsx`
- `app/org/[slug]/repo/[repoName]/stories/[storyId]/page.tsx`
- `app/org/[slug]/repo/[repoName]/runs/[runId]/page.tsx`
- `app/setup/page.tsx`

```typescript
export const dynamic = 'force-dynamic'
export const dynamicParams = true
```

**Why:**

- User-specific data (requires authentication)
- Real-time data (runs, stories change frequently)
- Cannot be statically generated

---

## Story Create Page (Dynamic)

**File:** `app/org/[slug]/repo/[repoName]/stories/new/page.tsx`

```typescript
export const dynamic = 'force-dynamic'
export const dynamicParams = true
```

**Why:** Form page, user-specific, no data to cache.

---

## API Routes

**Files:** `app/api/**/*.ts`

No route segment configs needed - API routes are always dynamic by default.

---

## Benefits of Adding These Configs

1. **Performance**: Explicit caching strategy reduces unnecessary server work
2. **Predictability**: Clear behavior instead of Next.js guessing
3. **Debugging**: Easier to understand why pages are cached or not
4. **Cost**: Better control over serverless function invocations
5. **SEO**: Landing pages can be fully static for better SEO

---

## Migration Checklist

- [ ] Add configs to landing pages (`app/page.tsx`, `app/auth/page.tsx`)
- [ ] Add configs to all dynamic route pages
- [ ] Test that pages still work correctly
- [ ] Monitor performance improvements
- [ ] Update documentation if needed
