import chalk from 'chalk';
import type { Meeting } from './types';
import type { AuthResult } from './auth';

export function welcome(): string {
  return [
    '',
    chalk.cyan.bold('  Meetfy'),
    chalk.dim('  Instant Meeting Creator — reserve time in Google Calendar'),
    '',
  ].join('\n');
}

export function meeting(meet: Meeting): string {
  const lines = [
    chalk.cyan.bold(`  ${meet.title}`),
    chalk.dim(`  🕐 ${meet.startTime} – ${meet.endTime}`),
  ];
  if (meet.hangoutLink) lines.push(chalk.blue(`  🔗 ${meet.hangoutLink}`));
  if (meet.location) lines.push(chalk.dim(`  📍 ${meet.location}`));
  return lines.join('\n');
}

export function authNeedCode(authUrl: string): string {
  return [
    chalk.cyan('🔐 Authorize this app by visiting this URL:'),
    chalk.blue(authUrl),
    '',
    chalk.green('Press Enter to copy URL and open in browser.'),
  ].join('\n');
}

export function authWaiting(): string {
  return chalk.dim('⏳ Waiting for code on port 3434...');
}

export function authSuccess(): string {
  return [
    chalk.green('✅ Authentication successful!'),
    '',
    chalk.dim('Available commands:'),
    chalk.cyan('  meetfy create') + chalk.dim('   Create an instant meeting (30 min)'),
    chalk.cyan('  meetfy next') + chalk.dim('     Show your next meeting'),
    chalk.cyan('  meetfy logout') + chalk.dim('   Log out from Google'),
  ].join('\n');
}

export function createSuccess(m: Meeting): string {
  return [
    chalk.green('✅ Meeting created successfully!'),
    chalk.cyan(`📅 ${m.title}`),
    chalk.blue(`🔗 ${m.hangoutLink}`),
    chalk.dim(`⏰ ${m.startTime} – ${m.endTime}`),
  ].join('\n');
}

export function logoutSuccess(): string {
  return chalk.green('✅ Logged out successfully!');
}

export function noMeetings(): string {
  return chalk.yellow('📭 No upcoming meetings found.');
}

export function nextMeetingTitle(): string {
  return chalk.cyan('📅 Next meeting:\n');
}

export function authErrorJson(result: AuthResult): string {
  return result.type === 'error' ? result.message : 'auth_required';
}
