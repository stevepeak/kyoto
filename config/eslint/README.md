# ESLint Config

ESLint configuration shared throughout the monorepo.

## Usage

These configs should be extended from every package/service in the monorepo to apply ESLint rules.

## Browser

The browser config should be used for browser environments that don't support Node/Bun runtime features.

```.eslintrc.cjs
/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['@dx/eslint-config/browser.cjs'],
};
```

## Bun

The Bun config should be used for server-side environments that support Node/Bun runtime features.

```.eslintrc.cjs
/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['@dx/eslint-config/bun.cjs'],
};

```
