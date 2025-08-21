import { defineConfig } from 'vitest/config';
import { parse } from 'yaml';
import fs from 'fs';
import { join } from 'path';

// import projects array from pnpm-workspace.yaml

const workspaceFile = fs.readFileSync(
  join(__dirname, 'pnpm-workspace.yaml'),
  'utf-8'
);
const yaml = parse(workspaceFile);
const projects = yaml.packages;

if (!Array.isArray(projects)) {
  throw new Error('Invalid pnpm-workspace.yaml: "packages" should be an array');
}

export default defineConfig({
  test: {
    projects,
    watch: false,
    coverage: {
      exclude: [
        '**/dist/**',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/docs/',
        '**/__tests__/',
        '**/__test__/',
      ],
    },
  },
});
