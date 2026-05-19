---
"meetfy": minor
---

build(cli): switch bundle from CJS to ESM

Ink 5 transitively depends on `yoga-wasm-web`, which uses top-level await and cannot be emitted in CJS. The CLI is now bundled as a single self-contained ESM file (`dist/index.js`, ~2.9 MB) so the AUR / single-file install pattern is preserved. Downstream packagers must update the binary path from `dist/index.cjs` to `dist/index.js`.
