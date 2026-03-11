import { Hono } from 'hono';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

const AUTH_URI = 'https://accounts.google.com/o/oauth2/auth';
const TOKEN_URI = 'https://oauth2.googleapis.com/token';

type Env = {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
};

const app = new Hono<{ Bindings: Env }>();

/**
 * GET /auth/url?forward=<url>
 * Returns Google OAuth authUrl. redirect_uri is this Worker's /callback.
 * CLI opens authUrl; after user authorizes, Google redirects to /callback.
 */
app.get('/auth/url', (c) => {
  const forward = c.req.query('forward');
  if (!forward || !forward.startsWith('http://localhost:')) {
    return c.json({ error: 'Missing or invalid forward (e.g. http://localhost:3434)' }, 400);
  }

  const clientId = c.env.GOOGLE_CLIENT_ID;
  const clientSecret = c.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return c.json({ error: 'Worker missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET' }, 500);
  }

  const { origin } = new URL(c.req.url);
  const redirectUri = `${origin}/callback`;
  const state = btoa(JSON.stringify({ forward }));

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    state,
    prompt: 'consent',
  });
  const authUrl = `${AUTH_URI}?${params.toString()}`;

  return c.json({ authUrl, redirectUri });
});

/**
 * GET /callback?code=...&state=...
 * Google redirects here. We exchange code for tokens and redirect to state.forward with tokens.
 */
app.get('/callback', async (c) => {
  const code = c.req.query('code');
  const stateParam = c.req.query('state');
  if (!code || !stateParam) {
    return c.text('Missing code or state', 400);
  }

  let state: { forward: string };
  try {
    state = JSON.parse(atob(stateParam)) as { forward: string };
  } catch {
    return c.text('Invalid state', 400);
  }

  const clientId = c.env.GOOGLE_CLIENT_ID;
  const clientSecret = c.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return c.text('Worker misconfigured', 500);
  }

  const { origin } = new URL(c.req.url);
  const redirectUri = `${origin}/callback`;

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const tokenRes = await fetch(TOKEN_URI, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return c.text(`Token exchange failed: ${err}`, 400);
  }

  const tokens = (await tokenRes.json()) as Record<string, unknown>;
  const payload = { ...tokens, client_id: c.env.GOOGLE_CLIENT_ID };
  const tokensB64 = btoa(JSON.stringify(payload));
  const forwardUrl = `${state.forward}${state.forward.includes('?') ? '&' : '?'}tokens=${encodeURIComponent(tokensB64)}`;

  return c.redirect(forwardUrl);
});

/**
 * POST /refresh
 * Body: { refresh_token: string }
 * Returns new tokens (uses Worker's client_secret). CLI calls this when access_token expires.
 */
app.post('/refresh', async (c) => {
  const body = await c.req.json().catch(() => ({})) as { refresh_token?: string };
  const refreshToken = body.refresh_token;
  if (!refreshToken) {
    return c.json({ error: 'Missing refresh_token' }, 400);
  }

  const clientId = c.env.GOOGLE_CLIENT_ID;
  const clientSecret = c.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return c.json({ error: 'Worker misconfigured' }, 500);
  }

  const { origin } = new URL(c.req.url);
  const redirectUri = `${origin}/callback`;

  const form = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch(TOKEN_URI, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return c.json({ error: `Refresh failed: ${err}` }, 400);
  }

  const tokens = await tokenRes.json();
  return c.json(tokens);
});

/**
 * Health check (no secrets).
 */
app.get('/', (c) => {
  const funnyMessages = [
    'Meetfy is running',
    'Meetfy is alive',
    'Meetfy is well',
    'Meetfy is great',
    'Meetfy is amazing',
    'Meetfy is fantastic',
    'Meetfy is wonderful',
    'Meetfy is awesome',
    'Meetfy is incredible',
    'Meetfy is superb',
    'Meetfy is incredible',
    'Meetfy is superb',
  ];
  return c.json({
    name: 'meetfy',
    ok: true,
    message: funnyMessages[Math.floor(Math.random() * funnyMessages.length)],
  });
});

export default app;
