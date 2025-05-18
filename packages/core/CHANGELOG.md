

# Changelog
## [0.2.2] - 2025-05-18
### Changed
- Added a `prepack` step in the wrapper to copy root `README.md` and `CHANGELOG.md` into the published npm package  
- Refactored `tsconfig.*.json` to share a base config and per-package overrides  
- Expanded ESLint and Jest configs to run against each workspace  

## [0.2.1] - 2025-05-18

### Changed
- README updated to reference the all‑in‑one `html-to-document` wrapper package  
- Installation instructions now show both using the wrapper (`html-to-document`) and standalone core (`html-to-document-core`) + adapter installs  
- Added “Adapters” section in README demonstrating how to install and register a standalone adapter

## [0.2.0] - 2025-05-18

### Added
- Initial monorepo migration for the core package  
- Packaged core parsing and conversion engine as `html-to-document-core`  
- Core API: `Converter`, `init`, middleware support, registry for adapters  
- Integrated shared `tsconfig` and per‑package build configs  
- Jest tests and ESLint config set up for the core workspace