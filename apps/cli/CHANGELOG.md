# meetfy

## 1.0.10

### Patch Changes

- a1ab4f4: feat: add file-based logging for auth and calendar operations

  Logs are written to `~/.local/state/meetfy/meetfy.log` with automatic rotation at 512 KB. Instruments token validation, refresh attempts, calendar list fetching, and event queries to aid debugging of intermittent auth failures (e.g., disappearing from waybar status bar).

## 1.0.9

### Patch Changes

- cf83923: improve OAuth token refresh handling

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
