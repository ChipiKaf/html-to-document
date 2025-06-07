## <small>0.2.9 (2025-06-07)</small>

* Fix TypeScript build output paths (#9) ([7b4747d](https://github.com/ChipiKaf/html-to-document/commit/7b4747d)), closes [#9](https://github.com/ChipiKaf/html-to-document/issues/9)



# Changelog

## [0.2.8] - 2025-06-04
### Changed
- Fix pdf page content cutting on new page
- Add support for default styling in pdf


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

All notable changes to this project will be documented in this file.
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
- Added a `prepack` step in the wrapper to copy root `README.md` and `CHANGELOG.md` into the published npm package  
- Refactored `tsconfig.*.json` to share a base config and per-package overrides  
- Expanded ESLint and Jest configs to run against each workspace  

## [0.2.0] – 2025-05-18
### Added
- Initial migration to a **monorepo** structure, splitting the project into three workspaces:
  - `packages/core`: the core HTML-to-document conversion engine  
  - `packages/adapters/*`: format-specific adapters (e.g. DOCX)  
  - `packages/html-to-document`: the wrapper package that re-exports core + adapters  
- New GitHub Actions workflow for publishing all workspaces in sequence (core → adapters → wrapper) with signed provenance  
- Root `package.json` scripts updated for workspace-aware **build**, **clean**, **lint**, and **test**  
## [0.1.2] - 2025-05-17
- Added live demo link to README.md.

## [0.1.1] - 2025-05-16
- Updated README.md to correct the documentation link.


## [0.1.0] - 2025-05-16
- Initial public release.