---
"meetfy": minor
---

feat(cli): redesign `meetfy create` as a multi-step wizard

Title, description, and participants are collected step-by-step (each step is skipped when its corresponding CLI flag is provided), then a confirmation panel lists the gathered values before invoking the calendar API. The success screen auto-copies the meet link to the clipboard.
