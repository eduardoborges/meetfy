import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const LOG_DIR = path.join(os.homedir(), '.local', 'state', 'meetfy');
const LOG_FILE = path.join(LOG_DIR, 'meetfy.log');
const MAX_LOG_SIZE = 512 * 1024; // 512 KB

function ensureLogDir(): void {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function rotateIfNeeded(): void {
  try {
    const stat = fs.statSync(LOG_FILE);
    if (stat.size > MAX_LOG_SIZE) {
      const old = LOG_FILE + '.old';
      fs.renameSync(LOG_FILE, old);
    }
  } catch {
    // file doesn't exist yet
  }
}

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

function write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  try {
    ensureLogDir();
    rotateIfNeeded();
    const ts = new Date().toISOString();
    let line = `${ts} [${level}] ${message}`;
    if (meta && Object.keys(meta).length > 0) {
      line += ` ${JSON.stringify(meta)}`;
    }
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch {
    // logging should never break the CLI
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => write('DEBUG', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => write('INFO', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write('WARN', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write('ERROR', msg, meta),
  /** Path to the log file, for user reference */
  logFile: LOG_FILE,
};
