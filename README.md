# Meetfy (monorepo)

CLI for creating instant meetings and reserving time in Google Calendar. **No credentials file on your machine** — auth goes through the hosted Auth Worker.

## Structure

- **`packages/cli`** – Meetfy CLI (`meetfy`). Uses the Auth Worker at `https://meetfy.eduardoborges.dev` for Google sign-in.
- **`packages/worker`** – Cloudflare Worker (Hono) that holds Google OAuth secrets and does the OAuth flow.

## Quick start

```sh
cd packages/cli
pnpm install
pnpm start -- auth    # sign in with Google (opens browser)
pnpm start -- create  # create a meeting
pnpm start -- next    # show next meeting
pnpm start -- logout  # sign out
```

Optional: set `MEETFY_AUTH_URL` to use a different Auth Worker (default: `https://meetfy.eduardoborges.dev`).

## Deploying the Auth Worker (maintainers)

1. Deploy the Worker (once):

   ```sh
   cd packages/worker
   pnpm install
   pnpm wrangler secret put GOOGLE_CLIENT_ID
   pnpm wrangler secret put GOOGLE_CLIENT_SECRET
   pnpm run deploy
   ```

2. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), set the OAuth 2.0 client **Authorized redirect URI** to:

   `https://meetfy.eduardoborges.dev/callback`

## Monorepo scripts (from repo root)

```sh
pnpm install          # install all workspaces
pnpm build            # build all packages
pnpm dev:cli          # run CLI (packages/cli)
pnpm dev:worker       # run Worker locally (packages/worker)
pnpm deploy:worker    # deploy Worker to Cloudflare
```

## License

MIT
