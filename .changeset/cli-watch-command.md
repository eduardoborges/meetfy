---
"meetfy": minor
---

feat(cli): add `meetfy watch` command

New long-running command that polls upcoming meetings across all configured accounts and fires desktop alerts 10 minutes and 1 minute before each one starts. Uses `paplay` for sound (falls back through a list of freedesktop sound files) and `notify-send` for the visual notification, so it targets Linux desktops. Each `(meeting, threshold)` pair only fires once per process to avoid duplicate alerts.
