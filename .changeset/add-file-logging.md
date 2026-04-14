---
"meetfy": patch
---

feat: add file-based logging for auth and calendar operations

Logs are written to `~/.local/state/meetfy/meetfy.log` with automatic rotation at 512 KB. Instruments token validation, refresh attempts, calendar list fetching, and event queries to aid debugging of intermittent auth failures (e.g., disappearing from waybar status bar).
