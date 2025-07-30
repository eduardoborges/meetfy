#!/usr/bin/env tsx --no-deprecation
import { Command } from 'commander';
import chalk from 'chalk';
import { createInstantMeeting } from './services/meetingService.js';
import { authenticateGoogle, logoutGoogle } from './services/authService.js';
import { showWelcomeMessage } from './utils/cliUtils.js';

const program = new Command();

program
  .name('meetfy')
  .description('CLI tool for creating instant meetings and reserving time in Google Calendar')
  .version('1.0.0');

program
  .command('create')
  .description('Create an instant meeting and reserve 30 minutes in your Google Calendar')
  .option('-t, --title <title>', 'Meeting title')
  .option('-d, --description <description>', 'Meeting description')
  .option('-p, --participants <emails>', 'Comma-separated list of participant emails')
  .action(async (options) => {
    try {
      showWelcomeMessage();

      // Authenticate with Google
      const auth = await authenticateGoogle();
      if (!auth) {
        console.log(chalk.red('❌ Authentication failed. Please try again.'));
        process.exit(1);
      }

      // Create instant meeting
      const meeting = await createInstantMeeting(auth, options);

      if (meeting) {
        console.log(chalk.green('✅ Meeting created successfully!'));
        console.log(chalk.cyan(`📅 Meeting ID: ${meeting.id}`));
        console.log(chalk.cyan(`🔗 Join URL: ${meeting.hangoutLink}`));
        console.log(chalk.cyan('⏰ Duration: 30 minutes'));
        console.log(chalk.cyan(`📅 Start Time: ${meeting.startTime}`));
      }
    } catch (error) {
      console.error(chalk.red('❌ Error creating meeting:'), error);
      process.exit(1);
    }
  });

program
  .command('auth')
  .description('Authenticate with Google Calendar')
  .addHelpText('after', `
    \nExamples:
    \n  meetfy auth
    \n  meetfy auth --help
  `)
  .action(async () => {
    try {
      showWelcomeMessage();
      const auth = await authenticateGoogle();
      if (auth) {
        console.log(chalk.green('✅ Authentication successful!'));
      } else {
        console.log(chalk.red('❌ Authentication failed.'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('❌ Authentication error:'), error);
      process.exit(1);
    }
  });

program
  .command('logout')
  .description('Logout from Google Calendar')
  .action(async () => {
    await logoutGoogle();
    console.log(chalk.green('✅ Logged out successfully!'));
  });

program.parse();
