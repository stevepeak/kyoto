import { defineESLintConfig } from '@ocavue/eslint-config'

export default defineESLintConfig(
  {
    react: true,
    markdown: false,
  },
  {
    ignores: [
      '**/*.md',
      '**/*.json',
      '**/dist/**',
      '**/node_modules/**',
      'docs/**',
      'packages/**/*.md',
      // Additional ignores for memory optimization
      '**/*.d.ts',
      '**/*.min.js',
      '**/coverage/**',
      '**/.turbo/**',
      '**/.trigger/**',
      '**/.next/**',
      '**/.astro/**',
      '**/*.config.js',
      '**/postcss.config.js',
      '**/tailwind.config.js',
      '**/next.config.js',
    ],
  },
  {
    rules: {
      // Require curly braces for all control statements
      curly: ['error', 'all'],
      // Ignore import ordering
      'import/order': 'off',
      'sort-imports': 'off',
      // Disable unicorn explicit length check rule
      'unicorn/explicit-length-check': 'off',
      // Disable TypeScript unsafe assignment and call rules
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
  {
    // Prevent importing server-side code in client-side code
    files: [
      'apps/web/components/**/*.{ts,tsx}',
      'apps/web/hooks/**/*.{ts,tsx}',
      'apps/web/lib/**/*.{ts,tsx}',
    ],
    ignores: [
      // These files legitimately need to import from @app/api
      'apps/web/components/providers/trpc-provider.tsx',
      'apps/web/client/trpc.ts',
      // Server-side files that legitimately need to import from @app/api and @app/db
      'apps/web/lib/trpc-server.ts',
      'apps/web/lib/auth.ts',
      'apps/web/app/api/**/*.ts',
      'apps/web/middleware.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@app/api', '@app/api/*'],
              message:
                'Do not import from @app/api in client-side code. Use @app/utils for shared constants and types, or use TRPC hooks for data fetching.',
              allowTypeImports: true, // Allow type-only imports
            },
            {
              group: ['@app/db', '@app/db/*'],
              message:
                'Do not import from @app/db in client-side code. Use TRPC for database access.',
              allowTypeImports: true, // Allow type-only imports
            },
          ],
        },
      ],
    },
  },
)
