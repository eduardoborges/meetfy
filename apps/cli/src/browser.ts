import open from 'open';
import { writeClipboard } from './clipboard.js';

export function copyAndOpenUrl(url: string): void {
  writeClipboard(url).catch(() => {});
  open(url).catch(() => {});
}
