/** @type {import('jest').Config} */
module.exports = {
  // Use ts‑jest to transform every TypeScript file
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.base.json',
      },
    ],
  },

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
  },

  testMatch: ['**/__tests__/**/*.test.ts'],

  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
};