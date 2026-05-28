---
"meetfy": patch
---

fix(aur): point PKGBUILD `install` at `dist/index.js`

The PKGBUILD was installing `dist/index.cjs`, but the tsup bundle only emits ESM (`dist/index.js`), matching the `bin` entry in `package.json`. The CJS path didn't exist, so the AUR package shipped a broken `/usr/bin/meetfy` binary. Also bumps the `nodejs` runtime dependency to `>=20` to stay in line with currently supported Node versions.
