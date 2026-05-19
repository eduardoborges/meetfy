import { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { useExit } from '../runScreen';
import { Welcome } from '../ui/Welcome';
import { ConfirmPrompt } from '../ui/ConfirmPrompt';
import { SuccessBox } from '../ui/SuccessBox';
import { logout, type LogoutResult } from '../auth';

type Phase =
  | { kind: 'pending' }
  | { kind: 'done'; result: LogoutResult }
  | { kind: 'cancelled' };

interface LogoutScreenProps {
  account?: string;
  all?: boolean;
}

export function LogoutScreen({ account, all = false }: LogoutScreenProps): JSX.Element {
  const exit = useExit();
  const [phase, setPhase] = useState<Phase>({ kind: 'pending' });

  useEffect(() => {
    if (phase.kind === 'done') {
      const t = setTimeout(() => exit(0), 1200);
      return () => clearTimeout(t);
    }
    if (phase.kind === 'cancelled') {
      const t = setTimeout(() => exit(0), 400);
      return () => clearTimeout(t);
    }
    return;
  }, [phase, exit]);

  const target = all ? 'all Google Calendar accounts' : account ? account : 'the active Google Calendar account';

  return (
    <Box flexDirection="column">
      <Welcome />
      {phase.kind === 'pending' ? (
        <ConfirmPrompt
          question={`Log out of ${target}?`}
          description={<Text dimColor>Only selected locally stored tokens will be removed.</Text>}
          onConfirm={() => {
            const result = logout(account, all);
            setPhase({ kind: 'done', result });
          }}
          onCancel={() => setPhase({ kind: 'cancelled' })}
        />
      ) : null}
      {phase.kind === 'done' ? (
        <SuccessBox title="Logged out successfully!">
          {phase.result.removed.length > 0 ? (
            <Text dimColor>Removed: {phase.result.removed.join(', ')}</Text>
          ) : (
            <Text dimColor>No account was removed.</Text>
          )}
          {phase.result.remaining.length > 0 ? (
            <Text dimColor>Use another account with: meetfy account use {phase.result.remaining[0]}</Text>
          ) : null}
        </SuccessBox>
      ) : null}
      {phase.kind === 'cancelled' ? (
        <Box marginY={1}>
          <Text dimColor>Cancelled.</Text>
        </Box>
      ) : null}
    </Box>
  );
}

export function runLogoutJson(opts: { account?: string; all?: boolean } = {}): number {
  const result = logout(opts.account, Boolean(opts.all));
  process.stdout.write(`${JSON.stringify({ success: true, ...result })}\n`);
  return 0;
}
