import http from 'node:http';
import { OAuth2Client } from 'google-auth-library';
import { getConfig, setConfig, clearConfig } from './config';

const WORKER_URL = (process.env.MEETFY_AUTH_URL ?? 'https://meetfy.eduardoborges.dev').replace(/\/$/, '');
const REDIRECT_PORT = 3434;

interface StoredTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  [key: string]: unknown;
}

const HTML_OK = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Meetfy</title>
    <style>
      body {
        font-family: system-ui;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
      }
      h1 {
        color: #22c55e;
      }
    </style>
  </head>
  <body>
    <h1>✅ Authenticated!</h1>
    <p>You can close this tab.</p>
  </body>
</html>
`;

function makeClient(clientId: string, tokens: Record<string, unknown>): OAuth2Client {
  const client = new OAuth2Client(clientId, '');
  client.setCredentials(tokens);
  return client;
}

/** Returns OAuth client if we have valid tokens; refreshes if expired. */
export async function getClient(): Promise<OAuth2Client | null> {
  const stored = getConfig('googleTokens') as StoredTokens | undefined;
  const clientId = getConfig('googleClientId') as string | undefined;
  if (!stored || !clientId) return null;

  let tokens = stored;
  if (stored.expiry_date && Date.now() > stored.expiry_date && stored.refresh_token) {
    try {
      const res = await fetch(`${WORKER_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: stored.refresh_token }),
      });
      if (res.ok) {
        tokens = { ...stored, ...(await res.json()) as StoredTokens };
        setConfig('googleTokens', tokens);
      }
    } catch {
      // keep existing
    }
  }
  return makeClient(clientId, tokens);
}

export type AuthResult =
  | { type: 'ok'; client: OAuth2Client }
  | { type: 'need_code'; authUrl: string; waitForTokens: () => Promise<OAuth2Client> }
  | { type: 'error'; message: string };

/** Check auth: returns client, or need_code (with authUrl + waitForTokens), or error. */
export async function authenticate(): Promise<AuthResult> {
  const client = await getClient();
  if (client) return { type: 'ok', client };

  const forward = `http://localhost:${REDIRECT_PORT}`;
  try {
    const res = await fetch(`${WORKER_URL}/auth/url?forward=${encodeURIComponent(forward)}`);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      return { type: 'error', message: err.error ?? 'Failed to get auth URL' };
    }
    const { authUrl } = (await res.json()) as { authUrl: string };
    return {
      type: 'need_code',
      authUrl,
      waitForTokens: () => waitForTokensThenSave(REDIRECT_PORT),
    };
  } catch (e) {
    return { type: 'error', message: (e as Error).message ?? 'Auth service unreachable' };
  }
}

/** Local server: waits for Worker redirect with tokens, saves to config, returns client. */
function waitForTokensThenSave(port: number): Promise<OAuth2Client> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const once = (err: Error | null, client?: OAuth2Client) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve(client!);
    };
    const server = http.createServer({ maxHeaderSize: 64 * 1024 }, (req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`);
      const raw = url.searchParams.get('tokens');
      if (!raw) {
        res.writeHead(400, { 'Content-Type': 'text/plain' }).end('Missing tokens');
        return;
      }
      try {
        const json = Buffer.from(raw, 'base64').toString('utf-8');
        const { client_id: clientId, ...tokens } = JSON.parse(json);
        if (!clientId || !tokens.access_token) throw new Error('Incomplete payload');

        res.writeHead(200, { 'Content-Type': 'text/html', Connection: 'close' }).end(HTML_OK);
        setConfig('googleTokens', tokens);
        setConfig('googleClientId', clientId);
        once(null, makeClient(clientId, tokens));
        server.close();
      } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain', Connection: 'close' }).end('Invalid tokens');
        once(new Error('Invalid tokens'));
        server.close();
      }
    });
    server.on('error', (err) => once(err));
    server.listen(port);
  });
}

export function logout(): void {
  clearConfig();
}
