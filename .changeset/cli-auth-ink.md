---
"meetfy": minor
---

feat(cli): redesign `meetfy auth` and auto-open the browser

The "Press Enter to copy URL and open in browser" gate is gone — the browser opens immediately once the auth URL is fetched. The URL is still copied to the clipboard so the manual fallback keeps working. Authentication state is rendered as an animated state machine (fetching → waiting → success / error).
