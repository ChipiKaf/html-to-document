/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.base.json' }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Treat every workspace’s source as part of one test project
  roots: [
    '<rootDir>/packages/core',
    '<rootDir>/packages/adapters',
  ],

  // Resolve workspace names inside tests
  moduleNameMapper: {
    '^html-to-document-core$': '<rootDir>/packages/core/src',
    '^html-to-document-adapter-docx$':
      '<rootDir>/packages/adapters/docx/src',
    '^html-to-document-adapter-pdf$': '<rootDir>/packages/adapters/pdf/src',
  },

  testMatch: ['**/__tests__/**/*.test.ts'],

  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
};