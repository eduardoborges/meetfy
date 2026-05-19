import { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { useExit } from '../runScreen';
import { Welcome } from '../ui/Welcome';
import { ConfirmPrompt } from '../ui/ConfirmPrompt';
import { SuccessBox } from '../ui/SuccessBox';
import { logout } from '../auth';

type Phase = 'pending' | 'done' | 'cancelled';

export function LogoutScreen(): JSX.Element {
  const exit = useExit();
  const [phase, setPhase] = useState<Phase>('pending');

  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(() => exit(0), 800);
      return () => clearTimeout(t);
    }
    if (phase === 'cancelled') {
      const t = setTimeout(() => exit(0), 400);
      return () => clearTimeout(t);
    }
    return;
  }, [phase, exit]);

  return (
    <Box flexDirection="column">
      <Welcome />
      {phase === 'pending' ? (
        <ConfirmPrompt
          question="Log out of Google Calendar?"
          description={<Text dimColor>All locally stored tokens will be removed.</Text>}
          onConfirm={() => {
            logout();
            setPhase('done');
          }}
          onCancel={() => setPhase('cancelled')}
        />
      ) : null}
      {phase === 'done' ? <SuccessBox title="Logged out successfully!" /> : null}
      {phase === 'cancelled' ? (
        <Box marginY={1}>
          <Text dimColor>Cancelled.</Text>
        </Box>
      ) : null}
    </Box>
  );
}

export function runLogoutJson(): number {
  logout();
  process.stdout.write(`${JSON.stringify({ success: true })}\n`);
  return 0;
}
