import { execFile as execFileCb, type ExecFileOptions } from 'node:child_process';

type ExecWithStdin = ExecFileOptions & { input?: string };

function execFileAsync(file: string, args: string[], options: ExecWithStdin): Promise<void> {
  return new Promise((resolve, reject) => {
    execFileCb(file, args, options, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/** Best-effort clipboard write without extra npm deps (safe for single-file bundles). */
export function writeClipboard(text: string): Promise<void> {
  const { platform } = process;
  if (platform === 'darwin') {
    return execFileAsync('pbcopy', [], { input: text });
  }
  if (platform === 'win32') {
    return execFileAsync('clip', [], { shell: true, input: text });
  }
  return execFileAsync('wl-copy', ['--', text], { env: process.env }).then(
    () => void 0,
    () => execFileAsync('xclip', ['-selection', 'clipboard'], { input: text }),
  );
}
