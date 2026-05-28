import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { getMergedUpcomingMeetings } from './meetings';
import { logger } from './logger';
import type { Meeting } from './types';

const POLL_INTERVAL_MS = 30_000;
const FETCH_LIMIT = 20;

const ALERTS: ReadonlyArray<{ minutes: number; label: string }> = [
  { minutes: 10, label: '10min' },
  { minutes: 1, label: '1min' },
];

const SOUND_CANDIDATES = [
  '/usr/share/sounds/freedesktop/stereo/alarm-clock-elapsed.oga',
  '/usr/share/sounds/freedesktop/stereo/complete.oga',
  '/usr/share/sounds/freedesktop/stereo/bell.oga',
];

function pickSound(): string | null {
  return SOUND_CANDIDATES.find((path) => existsSync(path)) ?? null;
}

function playSound(soundPath: string | null): void {
  if (!soundPath) return;
  const child = spawn('paplay', [soundPath], { stdio: 'ignore', detached: true });
  child.on('error', (err) => {
    logger.warn('watch: paplay failed', { error: String(err) });
  });
  child.unref();
}

function sendNotification(title: string, body: string): void {
  const child = spawn('notify-send', ['-u', 'normal', '-a', 'meetfy', title, body], {
    stdio: 'ignore',
    detached: true,
  });
  child.on('error', (err) => {
    logger.warn('watch: notify-send failed', { error: String(err) });
  });
  child.unref();
}

function alertKey(meeting: Meeting, minutes: number): string {
  return `${meeting.accountEmail ?? ''}::${meeting.id}::${minutes}`;
}

function meetingFireWindowMs(): number {
  return POLL_INTERVAL_MS + 5_000;
}

function shouldFire(now: number, startMs: number, minutes: number): boolean {
  const targetMs = startMs - minutes * 60_000;
  const window = meetingFireWindowMs();
  return now >= targetMs && now < targetMs + window;
}

function fireAlert(meeting: Meeting, minutes: number, soundPath: string | null): void {
  const account = meeting.accountEmail ? ` · ${meeting.accountEmail}` : '';
  const title = `Meeting in ${minutes} min`;
  const body = `${meeting.title}${account}\n${meeting.startTime}`;
  process.stdout.write(`🔔 [${new Date().toLocaleTimeString()}] ${title}: ${meeting.title}${account}\n`);
  playSound(soundPath);
  sendNotification(title, body);
}

export async function runWatch(): Promise<void> {
  const soundPath = pickSound();
  if (!soundPath) {
    process.stderr.write('⚠️  No system sound file found; alerts will be silent.\n');
  }
  process.stdout.write(
    `👀 meetfy watch started (alerts at ${ALERTS.map((a) => `${a.minutes}min`).join(' and ')} before each meeting)\n`,
  );
  process.stdout.write('Press Ctrl+C to stop.\n');

  const fired = new Set<string>();

  const tick = async (): Promise<void> => {
    try {
      const { meetings, failedAccounts } = await getMergedUpcomingMeetings(undefined, FETCH_LIMIT);
      if (failedAccounts.length > 0) {
        logger.warn('watch: some accounts failed to load', { failedAccounts });
      }
      const now = Date.now();
      for (const meeting of meetings) {
        if (typeof meeting.startMs !== 'number') continue;
        if (meeting.startMs < now) continue;
        for (const { minutes } of ALERTS) {
          const key = alertKey(meeting, minutes);
          if (fired.has(key)) continue;
          if (shouldFire(now, meeting.startMs, minutes)) {
            fireAlert(meeting, minutes, soundPath);
            fired.add(key);
          }
        }
      }

      // Garbage-collect fired keys for events that have already started.
      const liveIds = new Set(meetings.map((m) => `${m.accountEmail ?? ''}::${m.id}`));
      for (const key of fired) {
        const id = key.split('::').slice(0, 2).join('::');
        if (!liveIds.has(id)) fired.delete(key);
      }
    } catch (err) {
      logger.error('watch: tick failed', {
        error: String(err),
        message: (err as Error).message,
      });
    }
  };

  let interval: ReturnType<typeof setInterval> | undefined;
  let resolveWait: (() => void) | undefined;
  let stopped = false;

  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    if (interval !== undefined) clearInterval(interval);
    process.stdout.write('\n👋 meetfy watch stopped.\n');
    resolveWait?.();
  };

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  try {
    await tick();
    interval = setInterval(() => {
      void tick();
    }, POLL_INTERVAL_MS);

    await new Promise<void>((resolve) => {
      resolveWait = resolve;
    });
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
  }
}
