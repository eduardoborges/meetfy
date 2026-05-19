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

      if (useJson) {
        const auth = await authenticate();
        if (auth.type !== 'ok') {
          json({ success: false, error: authErrorJson(auth) });
          process.exit(1);
        }
        const title = opts.title?.trim() || 'Instant Meeting';
        const description = opts.description?.trim() || 'Instant meeting created via Meetfy CLI';
        const participants = (opts.participants ?? '').split(',').map((e) => e.trim()).filter(Boolean);
        const result = await createMeeting(auth.client, { title, description, participants });
        if (result) json({ success: true, meeting: result });
        else json({ success: false, error: 'Failed to create meeting' });
        process.exit(result ? 0 : 1);
      }

      console.log(welcome());
      const rl = createRl();
      const title = opts.title?.trim() || (await question(rl, 'Meeting title', 'Instant Meeting'));
      const description = opts.description?.trim() || (await question(rl, 'Meeting description', 'Instant meeting created via Meetfy CLI'));
      const participantsStr = opts.participants ?? (await question(rl, 'Participant emails (comma-separated)', ''));
      closeRl(rl);

      const client = await getClient();
      if (!client) {
        console.error(chalk.red('❌ Not authenticated. Run meetfy auth first.'));
        process.exit(1);
      }
      const participants = participantsStr.split(',').map((e) => e.trim()).filter(Boolean);
      console.log(chalk.dim('\n⏳ Creating meeting...'));
      const result = await createMeeting(client, { title, description, participants });
      if (result) console.log('\n' + createSuccess(result));
      else {
        console.error(chalk.red('\n❌ Failed to create meeting. Run meetfy auth if needed.'));
        process.exit(1);
      }
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
      let client = await getClient();

      const fetchWithRetry = async () => {
        try {
          return await getNextMeeting(client!);
        } catch {
          // Total API failure — reload tokens (may have been refreshed by another
          // process) and try once more before reporting "no meetings".
          const fresh = await getClient();
          if (!fresh) throw new Error('auth_required');
          client = fresh;
          return await getNextMeeting(fresh);
        }
      };

      if (useJson) {
        if (!client) {
          json({ success: false, error: 'auth_required' });
          process.exit(1);
        }
        try {
          const result = await fetchWithRetry();
          json({ success: true, meeting: result ?? null });
        } catch (err) {
          const msg = (err as Error).message;
          json({ success: false, error: msg === 'auth_required' ? 'auth_required' : 'api_error' });
          process.exit(1);
        }
        return;
      }

      console.log(welcome());
      if (!client) {
        console.error(chalk.red('❌ Not authenticated. Run meetfy auth first.'));
        process.exit(1);
      }
      let result;
      try {
        result = await fetchWithRetry();
      } catch {
        console.error(chalk.red('❌ Failed to reach Google Calendar.'));
        process.exit(1);
      }
      if (!result) {
        console.log(noMeetings());
        return;
      }
      console.log(nextMeetingTitle());
      console.log(meeting(result));
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
