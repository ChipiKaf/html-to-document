module.exports = [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'],
  },

  // Core package
  {
    files: [
      'packages/core/src/**/*.{ts,tsx}',
      'packages/core/__tests__/**/*.{ts,tsx}',
    ],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        project: './packages/core/tsconfig.lint.json',
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
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  // Global test overrides
  {
    files: ['**/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
];
