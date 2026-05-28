import readline from 'node:readline/promises';
import { Command } from 'commander';
import { getClient } from './auth';
import {
  getAccount,
  getActiveAccount,
  listAccounts,
  migrateIfNeeded,
  removeAccount,
  setActiveAccount,
} from './config';
import { runScreen } from './runScreen';
import { LogoutScreen, runLogoutJson } from './screens/LogoutScreen';
import { NextScreen, runNextJson } from './screens/NextScreen';
import { CreateScreen, runCreateJson } from './screens/CreateScreen';
import { HomeScreen } from './screens/HomeScreen';
import { AuthScreen, runAuthJson } from './screens/AuthScreen';
import { runWatch } from './watch';
import pk from '../package.json';

interface GlobalOptions {
  json?: boolean;
  account?: string;
}

function globalOptions(program: Command): GlobalOptions {
  return program.opts<GlobalOptions>();
}

async function confirm(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  try {
    const answer = await rl.question(`${question} [y/N] `);
    return ['y', 'yes'].includes(answer.trim().toLowerCase());
  } finally {
    rl.close();
  }
}

export async function runCli(): Promise<void> {
  await migrateIfNeeded();

  const program = new Command();

  program
    .name('meetfy')
    .description('CLI tool for creating instant meetings and reserving time in Google Calendar')
    .version(pk.version)
    .option('--json', 'Output result as JSON')
    .option('--account <email>', 'Use a specific Google account for this command');

  program.action(async () => {
    const { json: useJson } = globalOptions(program);
    if (useJson || !process.stdout.isTTY) {
      process.stdout.write(
        `${JSON.stringify({ activeAccount: getActiveAccount(), accounts: listAccounts() })}\n`,
      );
      return;
    }
    process.exit(await runScreen(<HomeScreen />));
  });

  // --- create ---
  program
    .command('create')
    .description('Create an instant meeting and reserve 30 minutes in your Google Calendar')
    .option('-t, --title <title>', 'Meeting title')
    .option('-d, --description <description>', 'Meeting description')
    .option('-p, --participants <emails>', 'Comma-separated list of participant emails')
    .action(async (opts: { title?: string; description?: string; participants?: string }) => {
      const { json: useJson, account } = globalOptions(program);
      if (useJson || !process.stdout.isTTY) {
        process.exit(await runCreateJson(opts, account));
      }
      const client = await getClient(account);
      if (!client) {
        process.stderr.write('❌ Not authenticated. Run `meetfy auth` first.\n');
        process.exit(1);
      }
      process.exit(await runScreen(<CreateScreen client={client} {...opts} />));
    });

  // --- auth ---
  program
    .command('auth')
    .description('Authenticate with Google Calendar')
    .action(async () => {
      const { json: useJson, account } = globalOptions(program);
      if (useJson || !process.stdout.isTTY) {
        process.exit(await runAuthJson(account));
      }
      process.exit(await runScreen(<AuthScreen account={account} />));
    });

  // --- account ---
  const accountCommand = program
    .command('account')
    .description('Manage authenticated Google accounts');

  accountCommand
    .command('list')
    .description('List authenticated Google accounts')
    .action(() => {
      const active = getActiveAccount();
      const accounts = listAccounts();
      if (accounts.length === 0) {
        process.stdout.write('No authenticated accounts.\n');
        return;
      }
      for (const email of accounts) {
        const marker = email === active ? '*' : ' ';
        const suffix = email === active ? ' (active)' : '';
        process.stdout.write(`${marker} ${email}${suffix}\n`);
      }
    });

  accountCommand
    .command('current')
    .description('Show the active Google account')
    .action(() => {
      const active = getActiveAccount();
      if (!active) {
        process.stderr.write('No active account.\n');
        process.exit(1);
      }
      process.stdout.write(`${active}\n`);
    });

  accountCommand
    .command('use')
    .description('Set the active Google account')
    .argument('<email>')
    .action((email: string) => {
      try {
        setActiveAccount(email);
        process.stdout.write(`Active account: ${email}\n`);
      } catch (err) {
        process.stderr.write(`${(err as Error).message}\n`);
        process.exit(1);
      }
    });

  accountCommand
    .command('remove')
    .description('Remove a Google account')
    .argument('<email>')
    .action(async (email: string) => {
      if (!getAccount(email)) {
        process.stderr.write(`Unknown account: ${email}\n`);
        process.exit(1);
      }
      if (email === getActiveAccount()) {
        const ok = await confirm(`Remove active account ${email}?`);
        if (!ok) {
          process.stdout.write('Cancelled.\n');
          return;
        }
      }
      removeAccount(email);
      const remaining = listAccounts();
      process.stdout.write(`Removed account: ${email}\n`);
      if (remaining.length > 0) {
        process.stdout.write(`Use another account with: meetfy account use ${remaining[0]}\n`);
      }
    });

  // --- logout ---
  program
    .command('logout')
    .description('Logout from Google Calendar')
    .option('--all', 'Remove all authenticated accounts')
    .action(async (opts: { all?: boolean }) => {
      const { json: useJson, account } = globalOptions(program);
      if (useJson || !process.stdout.isTTY) {
        process.exit(runLogoutJson({ account, all: Boolean(opts.all) }));
      }
      process.exit(await runScreen(<LogoutScreen account={account} all={Boolean(opts.all)} />));
    });

  // --- next ---
  program
    .command('next')
    .description('Show your next scheduled meeting')
    .action(async () => {
      const { json: useJson, account } = globalOptions(program);
      if (useJson || !process.stdout.isTTY) {
        process.exit(await runNextJson(account));
      }
      process.exit(await runScreen(<NextScreen account={account} />));
    });

  // --- watch ---
  program
    .command('watch')
    .description('Watch upcoming meetings and play a sound 10min and 1min before each one')
    .action(async () => {
      await runWatch();
    });

  program.parse();
}
