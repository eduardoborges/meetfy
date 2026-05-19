import { Command } from 'commander';
import chalk from 'chalk';
import {
  authenticate,
  getClient,
  logout,
  type AuthResult,
} from './auth';
import { createMeeting, getNextMeeting } from './calendar';
import {
  welcome,
  meeting,
  authNeedCode,
  authWaiting,
  authSuccess,
  createSuccess,
  logoutSuccess,
  noMeetings,
  nextMeetingTitle,
  authErrorJson,
} from './format';
import { createRl, question, closeRl } from './prompts';
import { copyAndOpenUrl } from './browser';
import { runScreen } from './runScreen';
import { HelloScreen } from './screens/HelloScreen';
import { LogoutScreen, runLogoutJson } from './screens/LogoutScreen';
import { NextScreen, runNextJson } from './screens/NextScreen';
import { CreateScreen, runCreateJson } from './screens/CreateScreen';

function json(obj: object): void {
  console.log(JSON.stringify(obj, null, 0));
}
import pk from '../package.json';

export function runCli(): void {
  const program = new Command();

  program
    .name('meetfy')
    .description('CLI tool for creating instant meetings and reserving time in Google Calendar')
    .version(pk.version)
    .option('--json', 'Output result as JSON');

  // --- create ---
  program
    .command('create')
    .description('Create an instant meeting and reserve 30 minutes in your Google Calendar')
    .option('-t, --title <title>', 'Meeting title')
    .option('-d, --description <description>', 'Meeting description')
    .option('-p, --participants <emails>', 'Comma-separated list of participant emails')
    .action(async (opts: { title?: string; description?: string; participants?: string }) => {
      const useJson = program.opts().json as boolean;
      if (useJson || !process.stdout.isTTY) {
        process.exit(await runCreateJson(opts));
      }
      const client = await getClient();
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
      const useJson = program.opts().json as boolean;
      const auth: AuthResult = await authenticate();

      if (useJson) {
        if (auth.type === 'ok') json({ success: true });
        else if (auth.type === 'need_code') json({ success: false, authRequired: true, authUrl: auth.authUrl });
        else json({ success: false, error: auth.message });
        process.exit(auth.type === 'ok' ? 0 : 1);
      }

      console.log(welcome());
      if (auth.type === 'ok') {
        console.log(authSuccess());
        process.exit(0);
      }
      if (auth.type === 'error') {
        console.error(chalk.red('❌'), auth.message);
        process.exit(1);
      }

      const tokensPromise = auth.waitForTokens();
      console.log(authNeedCode(auth.authUrl));
      console.log(authWaiting());

      const rl = createRl();
      await new Promise<void>((r) => rl.once('line', r));
      closeRl(rl);
      copyAndOpenUrl(auth.authUrl);

      try {
        await tokensPromise;
        console.log('\n' + authSuccess());
      } catch {
        console.error(chalk.red('\n❌ Failed to get token.'));
        process.exit(1);
      }
      process.exit(0);
    });

  // --- logout ---
  program
    .command('logout')
    .description('Logout from Google Calendar')
    .action(async () => {
      const useJson = program.opts().json as boolean;
      if (useJson || !process.stdout.isTTY) {
        process.exit(runLogoutJson());
      }
      process.exit(await runScreen(<LogoutScreen />));
    });

  // --- next ---
  program
    .command('next')
    .description('Show your next scheduled meeting')
    .action(async () => {
      const useJson = program.opts().json as boolean;
      if (useJson || !process.stdout.isTTY) {
        process.exit(await runNextJson());
      }
      const client = await getClient();
      if (!client) {
        process.stderr.write('❌ Not authenticated. Run `meetfy auth` first.\n');
        process.exit(1);
      }
      process.exit(await runScreen(<NextScreen client={client} />));
    });

  // --- __test-ink (hidden smoke-test command; removed in cleanup commit) ---
  program
    .command('__test-ink', { hidden: true })
    .description('Internal: smoke-test the ink bundle')
    .action(async () => {
      const code = await runScreen(<HelloScreen />);
      process.exit(code);
    });

  program.parse();
}
