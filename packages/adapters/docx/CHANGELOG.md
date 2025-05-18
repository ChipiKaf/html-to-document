

# Changelog

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