---
'meetfy': patch
---

Fix OAuth access token refresh: compute and store `expiry_date` from Google’s `expires_in` on login and after `/refresh`, and treat missing `expiry_date` as expired so `meetfy next` keeps working after the access token TTL (~1 hour).
