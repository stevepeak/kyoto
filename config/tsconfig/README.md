# Shared TypeScript Config

This is the base TypeScript config that should be extended from every package/service in the monorepo.

Example usage:

```tsconfig.json
{
  "extends": "tsconfig/bun.json",
  "include": ["src"],
  "exclude": ["**/node_modules", "**/.*/"]
}
```
