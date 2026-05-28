---
"meetfy-worker": patch
---

chore(worker): move from `packages/worker` to `apps/worker`

The Cloudflare Worker is a deployable application, not a library consumed by other workspace packages, so it belongs under `apps/*`. The pnpm workspace already globs both `apps/*` and `packages/*`, and CI/changesets reference the package by name (`meetfy-worker`), so no pipeline changes were needed.
