---
"meetfy": patch
---

chore(cli): lower tsup build target to `node20`

Aligns the bundle target with the runtime floor the AUR PKGBUILD declares (`nodejs>=20`) so users on Node 20 LTS aren't shipped syntax that requires a newer runtime. Also pins `esbuild@0.28.0` as an explicit devDependency to keep the tsup toolchain reproducible.
