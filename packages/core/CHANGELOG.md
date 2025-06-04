# Changelog

## [0.2.8] - 2025-06-04

## [0.2.7] - 2025-05-30
### Changed
- Updated documentation to give more details of how the package works

## [0.2.6] - 2025-05-30
### Changed
- Updated documentation to give more details of how the package works

## [0.2.5] - 2025-05-30
### Changed
- Updated documentation to give more details of how the package works

## [0.2.4] - 2025-05-20

### Fixed

- Added default style spec support for `<img>` elements in CSS mapping
- Fixed browser crash related to `image-size` dynamic require by moving it to a Node-only dynamic import

## [0.2.3] - 2025-05-19

### Changed

- Updated documentation to give more details of how the package works

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
