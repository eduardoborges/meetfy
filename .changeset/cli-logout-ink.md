---
"meetfy": patch
---

feat(cli): redesign `meetfy logout` with a y/N confirmation prompt

Replaces the unprompted logout with an Ink confirmation step before tokens are cleared. `--json` and non-TTY invocations preserve the existing `{"success":true}` contract.
