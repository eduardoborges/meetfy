import Conf from 'conf';
import { calendar } from '@googleapis/calendar';
import { OAuth2Client } from 'google-auth-library';
import { logger } from './logger';

const conf = new Conf<Record<string, unknown>>({
  projectName: 'meetfy',
  configName: 'meetfy-config',
});

export interface StoredTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  [key: string]: unknown;
}

export interface Account {
  clientId: string;
  tokens: StoredTokens;
}

type AccountMap = Record<string, Account>;

function getAccounts(): AccountMap {
  return (conf.get('accounts') as AccountMap | undefined) ?? {};
}

function isStoredTokens(value: unknown): value is StoredTokens {
  return Boolean(value && typeof value === 'object' && typeof (value as StoredTokens).access_token === 'string');
}

function makeClient(clientId: string, tokens: StoredTokens): OAuth2Client {
  const client = new OAuth2Client(clientId, '');
  client.setCredentials(tokens);
  return client;
}

async function resolveStoredAccountEmail(account: Account): Promise<string> {
  const cal = calendar({ version: 'v3', auth: makeClient(account.clientId, account.tokens) });
  const { data } = await cal.calendarList.get({ calendarId: 'primary' });
  if (!data.id) throw new Error('Primary calendar does not expose an account email');
  return data.id;
}

export async function migrateIfNeeded(): Promise<void> {
  if (conf.get('version') === 2) return;

  const legacyTokens = conf.get('googleTokens');
  const legacyClientId = conf.get('googleClientId');

  conf.set('version', 2);
  conf.delete('googleTokens');
  conf.delete('googleClientId');

  if (!isStoredTokens(legacyTokens) || typeof legacyClientId !== 'string') {
    if (!conf.get('accounts')) conf.set('accounts', {});
    return;
  }

  try {
    const account = { clientId: legacyClientId, tokens: legacyTokens };
    const email = await resolveStoredAccountEmail(account);
    conf.set('accounts', { ...getAccounts(), [email]: account });
    conf.set('activeAccount', email);
    logger.info('migrateIfNeeded: migrated legacy Google account', { email });
  } catch (err) {
    conf.set('accounts', {});
    conf.delete('activeAccount');
    logger.warn('migrateIfNeeded: failed to resolve legacy account email; cleared legacy auth', {
      error: String(err),
      message: (err as Error).message,
    });
  }
}

export function listAccounts(): string[] {
  const sorted: string[] = [];
  for (const email of Object.keys(getAccounts())) {
    const index = sorted.findIndex((existing) => email.localeCompare(existing) < 0);
    if (index === -1) sorted.push(email);
    else sorted.splice(index, 0, email);
  }
  return sorted;
}

export function getActiveAccount(): string | null {
  const email = conf.get('activeAccount');
  return typeof email === 'string' ? email : null;
}

export function setActiveAccount(email: string): void {
  if (!getAccount(email)) throw new Error(`Unknown account: ${email}`);
  conf.set('activeAccount', email);
}

export function getAccount(email: string): Account | null {
  return getAccounts()[email] ?? null;
}

export function upsertAccount(email: string, account: Account): void {
  conf.set('accounts', { ...getAccounts(), [email]: account });
}

export function removeAccount(email: string): void {
  const accounts = getAccounts();
  if (!accounts[email]) return;
  const { [email]: _removed, ...next } = accounts;
  conf.set('accounts', next);
  if (getActiveAccount() === email) conf.delete('activeAccount');
}

export function clearAccounts(): void {
  conf.set('version', 2);
  conf.set('accounts', {});
  conf.delete('activeAccount');
  conf.delete('googleTokens');
  conf.delete('googleClientId');
}
