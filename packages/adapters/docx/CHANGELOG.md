

# Changelog
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