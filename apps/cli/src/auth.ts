import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { calendar } from '@googleapis/calendar';
import { OAuth2Client } from 'google-auth-library';
import {
  clearAccounts,
  getAccount,
  getActiveAccount,
  listAccounts,
  removeAccount,
  setActiveAccount,
  upsertAccount,
  type StoredTokens,
} from './config';
import { logger } from './logger';

const WORKER_URL = (process.env.MEETFY_AUTH_URL ?? 'https://meetfy.eduardoborges.dev').replace(/\/$/, '');
const REDIRECT_PORT = 3434;

const LOCK_PATH = path.join(os.tmpdir(), 'meetfy-token-refresh.lock');
const LOCK_WAIT_TIMEOUT_MS = 10_000;
const LOCK_STALE_MS = 30_000;
const LOCK_POLL_MS = 100;

async function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  while (true) {
    try {
      const fd = fs.openSync(LOCK_PATH, 'wx');
      fs.closeSync(fd);
      try {
        return await fn();
      } finally {
        try { fs.unlinkSync(LOCK_PATH); } catch { /* best-effort */ }
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
      try {
        const stat = fs.statSync(LOCK_PATH);
        if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
          fs.unlinkSync(LOCK_PATH);
          continue;
        }
      } catch { /* lock vanished between check and stat; retry */ }
      if (Date.now() - start > LOCK_WAIT_TIMEOUT_MS) {
        throw new Error('token refresh lock timeout', { cause: err });
      }
      await new Promise((r) => setTimeout(r, LOCK_POLL_MS));
    }
  }
}

/**
 * Google returns expires_in (seconds from now). Persist as expiry_date (epoch ms) for refresh checks.
 * Only call this for a payload just received from the token endpoint, not when loading old config from disk
 * (stale expires_in would lie about remaining lifetime).
 */
function storeFreshTokens(tokens: Record<string, unknown>): StoredTokens {
  const expiresIn = tokens.expires_in;
  const expiry_date =
    typeof expiresIn === 'number'
      ? Date.now() + expiresIn * 1000
      : typeof tokens.expiry_date === 'number'
        ? tokens.expiry_date
        : undefined;
  return { ...tokens, expiry_date } as StoredTokens;
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

export async function resolveAccountEmail(client: OAuth2Client): Promise<string> {
  const cal = calendar({ version: 'v3', auth: client });
  const { data } = await cal.calendarList.get({ calendarId: 'primary' });
  if (!data.id) throw new Error('Could not resolve Google account email');
  return data.id;
}

/** Returns OAuth client if we have valid tokens; refreshes if expired. */
export async function getClient(email?: string): Promise<OAuth2Client | null> {
  const accountEmail = email ?? getActiveAccount();
  if (!accountEmail) {
    logger.warn('getClient: no active account');
    return null;
  }

  const account = getAccount(accountEmail);
  if (!account) {
    logger.warn('getClient: account not found', { email: accountEmail });
    return null;
  }

  const clientId = account.clientId;
  let tokens = { ...account.tokens } as StoredTokens;

  const skewMs = 60_000;
  const expired =
    !tokens.expiry_date || Date.now() > tokens.expiry_date - skewMs;

  logger.debug('getClient: token check', {
    email: accountEmail,
    expiry_date: tokens.expiry_date,
    now: Date.now(),
    expired,
    hasRefreshToken: Boolean(tokens.refresh_token),
  });

  if (expired) {
    if (!tokens.refresh_token) {
      logger.error('getClient: token expired and no refresh_token available', { email: accountEmail });
      return null;
    }
    try {
      tokens = await withRefreshLock(async () => {
        const latestAccount = getAccount(accountEmail);
        const latest = latestAccount ? { ...latestAccount.tokens } : tokens;
        const stillExpired =
          !latest.expiry_date || Date.now() > latest.expiry_date - skewMs;
        if (!stillExpired) {
          logger.info('getClient: token refreshed by another process; reusing', {
            email: accountEmail,
            expiry_date: latest.expiry_date,
          });
          return latest;
        }
        logger.info('getClient: refreshing expired token', { email: accountEmail });
        const res = await fetch(`${WORKER_URL}/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: latest.refresh_token }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          logger.error('getClient: refresh request failed', {
            email: accountEmail,
            status: res.status,
            statusText: res.statusText,
            body: body.slice(0, 500),
          });
          throw new Error(`refresh failed: ${res.status}`);
        }
        const fresh = (await res.json()) as Record<string, unknown>;
        const refreshed = storeFreshTokens({ ...latest, ...fresh });
        upsertAccount(accountEmail, { clientId, tokens: refreshed });
        logger.info('getClient: token refreshed successfully', {
          email: accountEmail,
          newExpiryDate: refreshed.expiry_date,
        });
        return refreshed;
      });
    } catch (err) {
      logger.error('getClient: refresh failed', {
        email: accountEmail,
        error: String(err),
        message: (err as Error).message,
      });
      return null;
    }
  }

  const stillExpired =
    !tokens.expiry_date || Date.now() > tokens.expiry_date - skewMs;
  if (stillExpired) {
    logger.error('getClient: token still expired after refresh', {
      email: accountEmail,
      expiry_date: tokens.expiry_date,
      now: Date.now(),
    });
    return null;
  }

  logger.debug('getClient: returning authenticated client', { email: accountEmail });
  return makeClient(clientId, tokens);
}

export type AuthResult =
  | { type: 'ok'; client: OAuth2Client; email: string }
  | { type: 'need_code'; authUrl: string; waitForTokens: () => Promise<{ client: OAuth2Client; email: string }> }
  | { type: 'error'; message: string };

interface AuthenticateOptions {
  forceLogin?: boolean;
}

/** Check auth: returns client, or need_code (with authUrl + waitForTokens), or error. */
export async function authenticate(email?: string, options: AuthenticateOptions = {}): Promise<AuthResult> {
  logger.info('authenticate: starting', { email, forceLogin: options.forceLogin });
  const resolvedEmail = email ?? getActiveAccount();
  if (!options.forceLogin) {
    const client = await getClient(resolvedEmail ?? undefined);
    if (client) {
      const activeEmail = resolvedEmail ?? getActiveAccount();
      if (!activeEmail) return { type: 'error', message: 'No active account' };
      logger.info('authenticate: existing client valid', { email: activeEmail });
      return { type: 'ok', client, email: activeEmail };
    }
  }

  const forward = `http://localhost:${REDIRECT_PORT}`;
  try {
    logger.info('authenticate: fetching auth URL from worker');
    const res = await fetch(`${WORKER_URL}/auth/url?forward=${encodeURIComponent(forward)}`);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      logger.error('authenticate: failed to get auth URL', { status: res.status, error: err.error });
      return { type: 'error', message: err.error ?? 'Failed to get auth URL' };
    }
    const { authUrl } = (await res.json()) as { authUrl: string };
    logger.info('authenticate: got auth URL, waiting for user');
    return {
      type: 'need_code',
      authUrl,
      waitForTokens: () => waitForTokensThenSave(REDIRECT_PORT),
    };
  } catch (e) {
    logger.error('authenticate: worker unreachable', { error: (e as Error).message });
    return { type: 'error', message: (e as Error).message ?? 'Auth service unreachable' };
  }
}

/** Local server: waits for Worker redirect with tokens, saves to config, returns client. */
function waitForTokensThenSave(port: number): Promise<{ client: OAuth2Client; email: string }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const once = (err: Error | null, result?: { client: OAuth2Client; email: string }) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve(result!);
    };
    const server = http.createServer({ maxHeaderSize: 64 * 1024 }, async (req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`);
      const raw = url.searchParams.get('tokens');
      if (!raw) {
        res.writeHead(400, { 'Content-Type': 'text/plain' }).end('Missing tokens');
        return;
      }
      try {
        const json = Buffer.from(raw, 'base64').toString('utf-8');
        const { client_id: clientId, ...tokens } = JSON.parse(json) as {
          client_id?: string;
          access_token?: string;
        } & Record<string, unknown>;
        if (!clientId || !tokens.access_token) throw new Error('Incomplete payload');

        const saved = storeFreshTokens(tokens);
        const client = makeClient(clientId, saved);
        const email = await resolveAccountEmail(client);
        upsertAccount(email, { clientId, tokens: saved });
        setActiveAccount(email);
        res.writeHead(200, { 'Content-Type': 'text/html', Connection: 'close' }).end(HTML_OK);
        once(null, { client, email });
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

export interface LogoutResult {
  removed: string[];
  remaining: string[];
}

export function logout(email?: string, all = false): LogoutResult {
  if (all) {
    const removed = listAccounts();
    clearAccounts();
    return { removed, remaining: [] };
  }

  const accountEmail = email ?? getActiveAccount();
  if (!accountEmail) return { removed: [], remaining: listAccounts() };
  if (!getAccount(accountEmail)) return { removed: [], remaining: listAccounts() };
  removeAccount(accountEmail);
  return { removed: [accountEmail], remaining: listAccounts() };
}
