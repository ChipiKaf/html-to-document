## <small>0.3.0 (2025-06-08)</small>

## 1.0.0

### Minor Changes

- [#58](https://github.com/ChipiKaf/html-to-document/pull/58) [`61d7ca4`](https://github.com/ChipiKaf/html-to-document/commit/61d7ca433297988e0b9796cf5b709030226dac5b) Thanks [@Alexnortung](https://github.com/Alexnortung)! - Added inline converter for images

- [#59](https://github.com/ChipiKaf/html-to-document/pull/59) [`38da5bc`](https://github.com/ChipiKaf/html-to-document/commit/38da5bca09e9a4e2f3fd26a72f815153cd4922b2) Thanks [@Alexnortung](https://github.com/Alexnortung)! - Added split text node by newlines utility and docx text converter will split them by default

- [#58](https://github.com/ChipiKaf/html-to-document/pull/58) [`61d7ca4`](https://github.com/ChipiKaf/html-to-document/commit/61d7ca433297988e0b9796cf5b709030226dac5b) Thanks [@Alexnortung](https://github.com/Alexnortung)! - Breaking: Fix typo in element convert interface (convertEement -> convertElement)

- [#61](https://github.com/ChipiKaf/html-to-document/pull/61) [`3071bba`](https://github.com/ChipiKaf/html-to-document/commit/3071bba5489444d41ace2c6e802db1f174e937d7) Thanks [@Alexnortung](https://github.com/Alexnortung)! - DOCX: Default section options config

### Patch Changes

- [#49](https://github.com/ChipiKaf/html-to-document/pull/49) [`a10ac85`](https://github.com/ChipiKaf/html-to-document/commit/a10ac85f27362ceacd586f31bd715d51e91fadaf) Thanks [@Alexnortung](https://github.com/Alexnortung)! - Fix table row not getting the correct style mapping and vertical align top

- [#60](https://github.com/ChipiKaf/html-to-document/pull/60) [`8fda6b9`](https://github.com/ChipiKaf/html-to-document/commit/8fda6b9eb9c5d651008d3fc27d972f1975b9b49b) Thanks [@Alexnortung](https://github.com/Alexnortung)! - Will now merge numbering config, so unordered or ordered default config is not lost

- [#54](https://github.com/ChipiKaf/html-to-document/pull/54) [`92474d8`](https://github.com/ChipiKaf/html-to-document/commit/92474d8fdab99efaff9cbfae6e9705d62e345dc8) Thanks [@Alexnortung](https://github.com/Alexnortung)! - Added webpackIgnore: true for node.js imports

- Updated dependencies [[`38da5bc`](https://github.com/ChipiKaf/html-to-document/commit/38da5bca09e9a4e2f3fd26a72f815153cd4922b2), [`a10ac85`](https://github.com/ChipiKaf/html-to-document/commit/a10ac85f27362ceacd586f31bd715d51e91fadaf), [`61d7ca4`](https://github.com/ChipiKaf/html-to-document/commit/61d7ca433297988e0b9796cf5b709030226dac5b)]:
  - html-to-document-core@0.5.0

## 0.5.0

### Minor Changes

- [#40](https://github.com/ChipiKaf/html-to-document/pull/40) [`ae22e43`](https://github.com/ChipiKaf/html-to-document/commit/ae22e439ef5376e92df15e1a924dee8adc5b10fe) Thanks [@Alexnortung](https://github.com/Alexnortung)! - Can now modify document options

### Patch Changes

- [#41](https://github.com/ChipiKaf/html-to-document/pull/41) [`5ef52e5`](https://github.com/ChipiKaf/html-to-document/commit/5ef52e527401d3397de5702b23076cc0c93b110b) Thanks [@Alexnortung](https://github.com/Alexnortung)! - remove conditional exports as they don't work downstream

- [#44](https://github.com/ChipiKaf/html-to-document/pull/44) [`5ac143b`](https://github.com/ChipiKaf/html-to-document/commit/5ac143b60c9091466dc74237ecdc95de1f30f755) Thanks [@Alexnortung](https://github.com/Alexnortung)! - Allow element converters to be imported

- Updated dependencies [[`4127e41`](https://github.com/ChipiKaf/html-to-document/commit/4127e41c79a04d775145d4742341ec73b3e230f5), [`5ef52e5`](https://github.com/ChipiKaf/html-to-document/commit/5ef52e527401d3397de5702b23076cc0c93b110b)]:
  - html-to-document-core@0.4.2

## 0.4.2

### Patch Changes

- [`301a878`](https://github.com/ChipiKaf/html-to-document/commit/301a8784fc40e59e9b56b8003cf78a23463784af) Thanks [@Alexnortung](https://github.com/Alexnortung)! - Switched to pnpm package manager

- Updated dependencies [[`301a878`](https://github.com/ChipiKaf/html-to-document/commit/301a8784fc40e59e9b56b8003cf78a23463784af)]:
  - html-to-document-core@0.4.1

## 0.4.1

### Patch Changes

- Fix dependency issues

## 0.4.0

### Minor Changes

- Add adapter-level config to init({ adapters.register }), enabling per-adapter element converters (blockConverters, inlineConverters, fallthroughConverters). DocxAdapter merges custom converters with its defaults—no breaking changes.

### Patch Changes

- Updated dependencies []:
  - html-to-document-core@0.4.0

### New Contributors

Thanks @Alexnortung!

- docs: document headers and update docx adapter guide (#13) ([b9c42e0](https://github.com/ChipiKaf/html-to-document/commit/b9c42e0)), closes [#13](https://github.com/ChipiKaf/html-to-document/issues/13)
- Add page sections and headers to docx adapter (#11) ([2f190c6](https://github.com/ChipiKaf/html-to-document/commit/2f190c6)), closes [#11](https://github.com/ChipiKaf/html-to-document/issues/11)
- Fix built-in docx adapter (#10) ([25ec976](https://github.com/ChipiKaf/html-to-document/commit/25ec976)), closes [#10](https://github.com/ChipiKaf/html-to-document/issues/10)

## <small>0.2.9 (2025-06-07)</small>

- Fix TypeScript build output paths (#9) ([7b4747d](https://github.com/ChipiKaf/html-to-document/commit/7b4747d)), closes [#9](https://github.com/ChipiKaf/html-to-document/issues/9)

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
