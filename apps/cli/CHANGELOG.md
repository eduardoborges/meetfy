# meetfy

## 1.1.0

### Minor Changes

- 69bbf57: feat(cli): redesign `meetfy auth` and auto-open the browser

  The "Press Enter to copy URL and open in browser" gate is gone — the browser opens immediately once the auth URL is fetched. The URL is still copied to the clipboard so the manual fallback keeps working. Authentication state is rendered as an animated state machine (fetching → waiting → success / error).

- ddfba1f: feat(cli): redesign `meetfy create` as a multi-step wizard

  Title, description, and participants are collected step-by-step (each step is skipped when its corresponding CLI flag is provided), then a confirmation panel lists the gathered values before invoking the calendar API. The success screen auto-copies the meet link to the clipboard.

- 1d3c5bf: build(cli): switch bundle from CJS to ESM

  Ink 5 transitively depends on `yoga-wasm-web`, which uses top-level await and cannot be emitted in CJS. The CLI is now bundled as a single self-contained ESM file (`dist/index.js`, ~2.9 MB) so the AUR / single-file install pattern is preserved. Downstream packagers must update the binary path from `dist/index.cjs` to `dist/index.js`.

- 54e986c: feat(cli): support multiple Google accounts

  Meetfy now stores Google auth by account email, keeps a persistent active account, supports one-off command overrides with `--account <email>`, and adds `meetfy account list|current|use|remove`. Running `meetfy` with no subcommand now opens an interactive account dashboard with a merged chronological agenda, account switching, add-account, and remove-account actions. `meetfy next` also reads every saved account by default, merges the upcoming meetings, and returns them sorted by start time. Legacy single-account configs migrate automatically on CLI boot.

- 2cdc279: feat(cli): redesign `meetfy next` as a navigable list of upcoming meetings

  Shows up to ten upcoming meetings with arrow / j-k navigation. Enter opens the selected meet link in the browser, c copies it to the clipboard, q quits. `calendar.ts` gains `getUpcomingMeetings(client, limit)`; `getNextMeeting` becomes a thin wrapper so the `--json` contract is unchanged.

### Patch Changes

- cc274a4: feat(cli): redesign `meetfy logout` with a y/N confirmation prompt

  Replaces the unprompted logout with an Ink confirmation step before tokens are cleared. `--json` and non-TTY invocations preserve the existing `{"success":true}` contract.

## 1.0.11

### Patch Changes

- 342b913: fix(cli): prevent concurrent token refresh races and distinguish API failures from empty calendars

  - Serialize OAuth token refresh with a cross-process lockfile so parallel `meetfy` invocations (e.g. waybar on multi-monitor setups) no longer invalidate each other's tokens.
  - `getNextMeeting` now throws when every calendar API call fails instead of returning `null`, letting callers distinguish a transient outage from "no upcoming events".
  - `next --json` retries once on total API failure after reloading tokens from disk, and reports `api_error` instead of an empty meeting list.

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
