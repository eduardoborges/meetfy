---
"meetfy": patch
---

fix(cli): prevent concurrent token refresh races and distinguish API failures from empty calendars

- Serialize OAuth token refresh with a cross-process lockfile so parallel `meetfy` invocations (e.g. waybar on multi-monitor setups) no longer invalidate each other's tokens.
- `getNextMeeting` now throws when every calendar API call fails instead of returning `null`, letting callers distinguish a transient outage from "no upcoming events".
- `next --json` retries once on total API failure after reloading tokens from disk, and reports `api_error` instead of an empty meeting list.
