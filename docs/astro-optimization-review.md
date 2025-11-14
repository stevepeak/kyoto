# Astro Navigation & Loading Optimization Review

## Current State Analysis

### ✅ What's Working Well

1. **Server-Side Rendering**: Using `output: 'server'` for SSR
2. **Client-Side Navigation**: Using `ClientRouter` from `astro:transitions` for smooth navigation
3. **Code Splitting**: Manual chunks configured for vendor libraries
4. **Build Optimizations**: CSS code splitting, terser minification, console removal

### 🔍 Areas for Optimization

## 1. Client Directive Optimization

### Current Issues

**Landing Page (`index.astro`):**
- `LandingNavbar` uses `client:load` - loads immediately (needed for interactivity ✅)
- `LandingHero` uses `client:load` - loads immediately (could be optimized)
- `Faq` uses `client:load` - loads immediately (could be optimized)

**App Pages:**
- All app pages use `client:load` - necessary for interactive components ✅

### Recommendations

#### Landing Page Optimizations

1. **Hero Section**: Change from `client:load` to `client:idle`
   - Hero is above the fold but doesn't need immediate interactivity
   - `client:idle` loads after main thread is free

2. **FAQ Section**: Change from `client:load` to `client:visible`
   - FAQ is below the fold
   - Only needs to hydrate when user scrolls to it
   - Saves initial bundle size

3. **Other Landing Components**: 
   - `FeatureGrid`, `Metrics`, `Testimonials`, `Pricing` are already server-rendered ✅
   - Consider making interactive parts use `client:visible` if they have interactivity

## 2. Image Optimization

### Current Issue

Using regular `<img>` tags instead of Astro's optimized Image component:

```tsx
// Current (apps/web/src/components/landing/metrics.tsx)
<img
  src="/github-status.png"
  alt="Kyoto status checks..."
  className="size-full object-cover"
/>

// Current (apps/web/src/components/landing/hero.tsx)
style={{ backgroundImage: "url('/kyoto.png')" }}
```

### Recommendations

1. **Use Astro's Image Component** for `/github-status.png`:
   - Automatic format conversion (WebP, AVIF)
   - Responsive srcsets
   - Lazy loading
   - Size optimization

2. **Optimize Background Image** (`/kyoto.png`):
   - Consider using CSS `background-image` with `loading="lazy"`
   - Or convert to Astro Image component if possible
   - Preload critical hero image

## 3. Link Prefetching

### Current Issue

No prefetching strategy for internal navigation links.

### Recommendations

1. **Add `data-astro-prefetch` to navigation links**:
   - Landing page nav links
   - App navigation links
   - Breadcrumb links

2. **Use `prefetch` directive** for critical routes:
   ```astro
   <a href="/app" data-astro-prefetch>App</a>
   ```

## 4. Resource Hints

### Current Issue

No resource hints in `<head>` for critical resources.

### Recommendations

Add to `layout.astro`:
```astro
<head>
  <!-- Preconnect to external domains -->
  <link rel="preconnect" href="https://api.github.com">
  
  <!-- Preload critical fonts -->
  <link rel="preload" href="/fonts/manrope/..." as="font" type="font/woff2" crossorigin>
  
  <!-- DNS prefetch for external resources -->
  <link rel="dns-prefetch" href="https://vercel.com">
</head>
```

## 5. Component Loading Strategy

### Current Pattern

All app components wrap in `AppProvider` which includes:
- `TrpcProvider` (React Query + tRPC)
- `AuthProvider`
- `Toaster`

### Optimization Opportunity

**Consider splitting providers:**
- Some pages might not need all providers
- Could lazy-load providers for non-critical pages
- But current pattern is fine for consistency

## 6. Astro View Transitions

### Current State

Using `ClientRouter` from `astro:transitions` ✅

### Potential Enhancements

1. **Add transition animations**:
   ```astro
   <ViewTransitions>
     <ClientRouter />
   </ViewTransitions>
   ```

2. **Use `transition:animate` directive** for smooth page transitions

## 7. Static Asset Optimization

### Recommendations

1. **Font Loading Strategy**:
   - Use `font-display: swap` in CSS
   - Preload critical fonts
   - Consider subsetting fonts

2. **CSS Optimization**:
   - Already using `cssCodeSplit: true` ✅
   - Consider purging unused Tailwind classes

## 8. API Route Optimization

### Current State

All API routes are server-rendered (`export const prerender = false`) ✅

### Recommendations

1. **Consider ISR for public pages** (when ready):
   - Currently commented out in config
   - Could enable for landing page sections

2. **API Response Caching**:
   - Add appropriate cache headers
   - Use Astro's built-in caching for static data

## Implementation Priority

### High Priority (Immediate Impact)

1. ✅ Change FAQ to `client:visible`
2. ✅ Change Hero to `client:idle` 
3. ✅ Add link prefetching to navigation
4. ✅ Optimize images with Astro Image component

### Medium Priority (Good Impact)

5. Add resource hints (preconnect, preload)
6. Optimize font loading
7. Add view transition animations

### Low Priority (Nice to Have)

8. Enable ISR when stable
9. Further code splitting optimizations
10. Advanced prefetching strategies

## Metrics to Track

After implementing optimizations, monitor:
- **First Contentful Paint (FCP)**
- **Largest Contentful Paint (LCP)**
- **Time to Interactive (TTI)**
- **Total Bundle Size**
- **JavaScript Execution Time**
- **Network Requests**

## Implementation Status

### ✅ Completed Optimizations

1. **Client Directive Optimization**
   - ✅ Changed `LandingHero` from `client:load` to `client:idle`
   - ✅ Changed `Faq` from `client:load` to `client:visible`
   - ✅ Kept `LandingNavbar` as `client:load` (needed for immediate interactivity)

2. **Image Optimization**
   - ✅ Added `loading="lazy"` and `decoding="async"` to `/github-status.png` in Metrics component
   - ✅ Added preload for critical hero background image (`/kyoto.png`)

3. **Link Prefetching**
   - ✅ Added `data-astro-prefetch` to all navigation links in `LandingNavbar`
   - ✅ Added `data-astro-prefetch` to breadcrumb links in `Breadcrumbs` component
   - ✅ Added `data-astro-prefetch` to home link in `TopNav` component

4. **Resource Hints**
   - ✅ Added `preconnect` and `dns-prefetch` for GitHub API in layout

### 📋 Remaining Optimizations

1. **Medium Priority**
   - Consider using Astro's Image component for `/github-status.png` (requires converting to Astro component)
   - Add font preloading for critical fonts
   - Add view transition animations

2. **Low Priority**
   - Enable ISR when stable
   - Further code splitting optimizations
   - Advanced prefetching strategies

## Next Steps

1. ✅ Implement high-priority optimizations (DONE)
2. Test performance improvements
3. Monitor Core Web Vitals
4. Iterate based on metrics
5. Consider implementing medium-priority optimizations

