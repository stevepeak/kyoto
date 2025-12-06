import { config as dexaConfig } from '@dexaai/config/eslint';

export const config = [
  ...dexaConfig,
  {
    languageOptions: { globals: { Bun: true } },
  },
  {
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
  { ignores: ['knip.ts', 'eslint.config.js'] },
];
