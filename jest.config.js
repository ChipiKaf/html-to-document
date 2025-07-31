/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      { tsconfig: '<rootDir>/tsconfig.test.json' },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!(pdfjs-dist)/).*'],

  // File extensions Jest should resolve
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Treat every workspace’s source as part of one test project
  roots: [
    '<rootDir>/packages/core',
    '<rootDir>/packages/adapters',
    '<rootDir>/packages/deconverters',
    '<rootDir>/packages/e2e-tests',
  ],

  // Resolve workspace names inside tests
  moduleNameMapper: {
    '^html-to-document-core$': '<rootDir>/packages/core/src',
    '^html-to-document-adapter-docx$': '<rootDir>/packages/adapters/docx/src',
    '^html-to-document-adapter-pdf$': '<rootDir>/packages/adapters/pdf/src',
    '^html-to-document-deconverter-pdf$':
      '<rootDir>/packages/deconverters/pdf/src',
  },

  testMatch: ['**/__tests__/**/*.test.ts'],

  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  // Use project-local cache directory to avoid OS temp permission issues
  cacheDirectory: '<rootDir>/.jest-cache',
};
