import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  workspaces: {
    '.': {
      entry: ['**/*.config.{js,ts}', 'turbo.json'],
      project: ['**/*.{js,ts,tsx}'],
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.turbo/**',
        '**/coverage/**',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/seed.sql',
        '**/schema.sql',
        '**/migrations/**',
      ],
      ignoreDependencies: ['tailwindcss'],
    },
    'apps/web': {
      entry: ['app/**/*.{ts,tsx}'],
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts',
        '**/.eslintrc.json',
        'hooks/use-mobile.ts',
      ],
      ignoreDependencies: [
        'kysely',
        '@radix-ui/react-separator',
        'posthog-node',
      ],
    },
    'apps/cli': {
      entry: ['src/index.ts', 'src/commands/**/*.ts'],
      project: ['src/**/*.ts'],
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
    },
    'apps/trigger': {
      entry: ['trigger.config.ts'],
      project: ['src/**/*.ts'],
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
      ignoreDependencies: ['@babel/preset-typescript', 'import-in-the-middle'],
    },
    'packages/api': {
      project: ['src/**/*.ts'],
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
    },
    'packages/db': {
      entry: ['src/db.ts'],
      project: ['src/**/*.ts'],
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/types.gen.ts',
        '**/*.d.ts',
        '**/migrations/**',
      ],
    },
    'packages/utils': {
      project: ['src/**/*.ts'],
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
    },
    'packages/agents': {
      project: ['src/**/*.ts'],
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts',
        'src/helpers/env.ts',
      ],
    },
  },
  ignore: [
    'apps/web/components/ui/**',
    '**/node_modules/**',
    '**/dist/**',
    '**/.turbo/**',
    '**/coverage/**',
    '**/*.d.ts',
    '**/types.gen.ts',
    '**/migrations/**',
    '**/seed.sql',
    '**/schema.sql',
  ],
  ignoreDependencies: [
    'vitest',
    '@types/*',
    '@codemirror/lang-css',
    '@codemirror/lang-html',
    '@codemirror/lang-javascript',
    '@codemirror/state',
    '@codemirror/view',
    '@uiw/react-codemirror',
  ],
  ignoreBinaries: ['pg_dump', 'psql', 'sed'],
}

export default config
