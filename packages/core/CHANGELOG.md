## <small>0.3.0 (2025-06-08)</small>

## 0.5.0

### Minor Changes

- [#59](https://github.com/ChipiKaf/html-to-document/pull/59) [`38da5bc`](https://github.com/ChipiKaf/html-to-document/commit/38da5bca09e9a4e2f3fd26a72f815153cd4922b2) Thanks [@Alexnortung](https://github.com/Alexnortung)! - Added split text node by newlines utility and docx text converter will split them by default

### Patch Changes

- [#49](https://github.com/ChipiKaf/html-to-document/pull/49) [`a10ac85`](https://github.com/ChipiKaf/html-to-document/commit/a10ac85f27362ceacd586f31bd715d51e91fadaf) Thanks [@Alexnortung](https://github.com/Alexnortung)! - Fix table row not getting the correct style mapping and vertical align top

- [#58](https://github.com/ChipiKaf/html-to-document/pull/58) [`61d7ca4`](https://github.com/ChipiKaf/html-to-document/commit/61d7ca433297988e0b9796cf5b709030226dac5b) Thanks [@Alexnortung](https://github.com/Alexnortung)! - Added resolve image functionality

## 0.4.2

### Patch Changes

- [#43](https://github.com/ChipiKaf/html-to-document/pull/43) [`4127e41`](https://github.com/ChipiKaf/html-to-document/commit/4127e41c79a04d775145d4742341ec73b3e230f5) Thanks [@Alexnortung](https://github.com/Alexnortung)! - Added intellisense for init adapter config

- [#41](https://github.com/ChipiKaf/html-to-document/pull/41) [`5ef52e5`](https://github.com/ChipiKaf/html-to-document/commit/5ef52e527401d3397de5702b23076cc0c93b110b) Thanks [@Alexnortung](https://github.com/Alexnortung)! - remove conditional exports as they don't work downstream

## 0.4.1

### Patch Changes

- [`301a878`](https://github.com/ChipiKaf/html-to-document/commit/301a8784fc40e59e9b56b8003cf78a23463784af) Thanks [@Alexnortung](https://github.com/Alexnortung)! - Switched to pnpm package manager

## 0.4.0

### Minor Changes

- Add adapter-level config to init({ adapters.register }), enabling per-adapter element converters (blockConverters, inlineConverters, fallthroughConverters). DocxAdapter merges custom converters with its defaults—no breaking changes.

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
