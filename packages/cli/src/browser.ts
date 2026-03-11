import open from 'open';
import clipboardy from 'clipboardy';

export function copyAndOpenUrl(url: string): void {
  clipboardy.write(url).catch(() => {});
  open(url).catch(() => {});
}
