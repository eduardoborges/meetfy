import * as readline from 'node:readline';

export function createRl(): readline.Interface {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

export function question(rl: readline.Interface, prompt: string, defaultVal = ''): Promise<string> {
  return new Promise((resolve) => {
    const p = defaultVal ? `${prompt} (${defaultVal}): ` : `${prompt}: `;
    rl.question(p, (answer) => resolve(answer.trim() || defaultVal.trim()));
  });
}

export function closeRl(rl: readline.Interface): void {
  rl.close();
}
