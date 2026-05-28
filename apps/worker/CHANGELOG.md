# meetfy-worker

## 1.2.0

### Patch Changes

- 3ebbfca: chore(worker): move from `packages/worker` to `apps/worker`

  The Cloudflare Worker is a deployable application, not a library consumed by other workspace packages, so it belongs under `apps/*`. The pnpm workspace already globs both `apps/*` and `packages/*`, and CI/changesets reference the package by name (`meetfy-worker`), so no pipeline changes were needed.

## 1.0.5

### Patch Changes

- 9e872d7: Setup Turborepo with remote caching and improved CI/CD pipeline
