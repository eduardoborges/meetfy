import { Command } from 'commander';
import { getClient } from './auth';
import { runScreen } from './runScreen';
import { LogoutScreen, runLogoutJson } from './screens/LogoutScreen';
import { NextScreen, runNextJson } from './screens/NextScreen';
import { CreateScreen, runCreateJson } from './screens/CreateScreen';
import { AuthScreen, runAuthJson } from './screens/AuthScreen';
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
      if (useJson || !process.stdout.isTTY) {
        process.exit(await runAuthJson());
      }
      process.exit(await runScreen(<AuthScreen />));
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

  program.parse();
}
