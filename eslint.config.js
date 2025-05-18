module.exports = [
  // Core package
  {
    files: ['packages/core/src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        project: './packages/core/tsconfig.json',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      prettier: require('eslint-plugin-prettier'),
    },
    rules: {
      ...require('eslint-plugin-prettier/recommended').rules,
      ...require('@typescript-eslint/eslint-plugin').configs.recommended.rules,
      'prettier/prettier': 'error',
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
    },
  },

  // Adapters packages
  {
    files: ['packages/adapters/*/src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        project: './packages/adapters/*/tsconfig.json',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      prettier: require('eslint-plugin-prettier'),
    },
    rules: {
      ...require('eslint-plugin-prettier/recommended').rules,
      ...require('@typescript-eslint/eslint-plugin').configs.recommended.rules,
      'prettier/prettier': 'error',
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
    },
  },
];
