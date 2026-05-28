---
"meetfy": patch
---

fix(cli): widen OAuth token refresh skew to 5 minutes

The token refresh check used a 60-second skew, which left a very narrow window for proactive refresh and occasionally allowed near-expired tokens through to the Google APIs. Bumped to 5 minutes and lifted the value into a `TOKEN_REFRESH_SKEW_MS` constant so all three expiry checks in `getClient` stay in sync.
