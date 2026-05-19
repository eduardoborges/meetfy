import { createContext, useContext, type ReactElement } from 'react';
import { render, useApp } from 'ink';

interface Outcome {
  exitCode: number;
}

const OutcomeContext = createContext<Outcome>({ exitCode: 0 });

export function useExit(): (code?: number) => void {
  const { exit } = useApp();
  const outcome = useContext(OutcomeContext);
  return (code = 0) => {
    outcome.exitCode = code;
    exit();
  };
}

export async function runScreen(element: ReactElement): Promise<number> {
  const outcome: Outcome = { exitCode: 0 };

  const onSigint = (): void => {
    outcome.exitCode = 130;
  };
  process.on('SIGINT', onSigint);

  const onExit = (): void => {
    if (process.stdout.isTTY) {
      process.stdout.write('[?25h');
    }
  };
  process.on('exit', onExit);

  const instance = render(
    <OutcomeContext.Provider value={outcome}>{element}</OutcomeContext.Provider>,
    { patchConsole: false, exitOnCtrlC: true },
  );

  try {
    await instance.waitUntilExit();
  } finally {
    process.off('SIGINT', onSigint);
    process.off('exit', onExit);
  }

  return outcome.exitCode;
}
