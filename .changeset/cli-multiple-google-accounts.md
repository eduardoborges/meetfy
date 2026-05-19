---
"meetfy": minor
---

feat(cli): support multiple Google accounts

Meetfy now stores Google auth by account email, keeps a persistent active account, supports one-off command overrides with `--account <email>`, and adds `meetfy account list|current|use|remove`. Running `meetfy` with no subcommand now opens an interactive account dashboard with a merged chronological agenda, account switching, add-account, and remove-account actions. `meetfy next` also reads every saved account by default, merges the upcoming meetings, and returns them sorted by start time. Legacy single-account configs migrate automatically on CLI boot.
