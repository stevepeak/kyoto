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
      ],
      ignoreDependencies: ['react-grab'],
    },
    'apps/cli': {
      entry: ['src/cli.tsx', 'src/commands/**/*.tsx'],
      project: ['src/**/*.ts', 'src/**/*.tsx'],
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts',
        'src/generated/**',
      ],
      ignoreDependencies: ['playwright', 'playwright-core'],
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
      project: ['src/**/*.ts'],
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/types.gen.ts',
        '**/*.d.ts',
        '**/migrations/**',
        '**/migrate.ts',
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
    'packages/daytona': {
      ignoreBinaries: ['daytona'],
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
  ],
  ignoreDependencies: ['@types/*'],
}

export default config
