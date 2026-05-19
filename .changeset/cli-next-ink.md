---
"meetfy": minor
---

feat(cli): redesign `meetfy next` as a navigable list of upcoming meetings

Shows up to ten upcoming meetings with arrow / j-k navigation. Enter opens the selected meet link in the browser, c copies it to the clipboard, q quits. `calendar.ts` gains `getUpcomingMeetings(client, limit)`; `getNextMeeting` becomes a thin wrapper so the `--json` contract is unchanged.
