## <small>0.2.9 (2025-06-07)</small>

* Fix TypeScript build output paths (#9) ([7b4747d](https://github.com/ChipiKaf/html-to-document/commit/7b4747d)), closes [#9](https://github.com/ChipiKaf/html-to-document/issues/9)




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

- README updated to reference the `html-to-document` wrapper package
- Installation instructions now show both the wrapper (`html-to-document`) and standalone core (`html-to-document-core`) + adapter installs
- Usage examples enhanced to import `DocxAdapter` from `html-to-document` directly

## [0.2.0] - 2025-05-18

### Added

- Initial release of the DOCX adapter for the HTML-to-document core
- Implementation of `DocxAdapter` class with `convert(elements: DocumentElement[]): Promise<Buffer>`
- Basic tests covering adapter registration and conversion functionality
