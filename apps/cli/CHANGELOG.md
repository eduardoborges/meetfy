# meetfy

## 1.0.8

### Patch Changes

- 75ef210: Fix OAuth access token refresh: compute and store `expiry_date` from Google’s `expires_in` on login and after `/refresh`, and treat missing `expiry_date` as expired so `meetfy next` keeps working after the access token TTL (~1 hour).

## 1.0.7

### Patch Changes

- 208a665: fix: reestructure

## 1.0.6

### Patch Changes

- 45b5be0: chore: update CLI versioning to use package.json version

## 1.0.5

### Patch Changes

- 9e872d7: Setup Turborepo with remote caching and improved CI/CD pipeline
