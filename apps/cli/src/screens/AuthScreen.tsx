import { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useExit } from '../runScreen';
import { Welcome } from '../ui/Welcome';
import { Spinner } from '../ui/Spinner';
import { ErrorBox } from '../ui/ErrorBox';
import { SuccessBox } from '../ui/SuccessBox';
import { authenticate, type AuthResult } from '../auth';
import { copyAndOpenUrl } from '../browser';

type Phase =
  | { kind: 'fetching' }
  | { kind: 'waiting'; authUrl: string }
  | { kind: 'success'; email: string }
  | { kind: 'error'; message: string };

function CommandList(): JSX.Element {
  return (
    <Box flexDirection="column">
      <Text dimColor>Available commands:</Text>
      <Text><Text color="cyan">  meetfy create</Text><Text dimColor>   Create an instant meeting (30 min)</Text></Text>
      <Text><Text color="cyan">  meetfy next  </Text><Text dimColor>   Show your next meeting</Text></Text>
      <Text><Text color="cyan">  meetfy logout</Text><Text dimColor>   Log out from Google</Text></Text>
    </Box>
  );
}

interface AuthScreenProps {
  account?: string;
}

export function AuthScreen({ account }: AuthScreenProps): JSX.Element {
  const exit = useExit();
  const [phase, setPhase] = useState<Phase>({ kind: 'fetching' });

  useEffect(() => {
    let cancelled = false;
    let waitPromise: Promise<{ email: string }> | null = null;

    const run = async (): Promise<void> => {
      try {
        const auth: AuthResult = await authenticate(account, { forceLogin: true });
        if (cancelled) return;
        if (auth.type === 'ok') {
          setPhase({ kind: 'success', email: auth.email });
          return;
        }
        if (auth.type === 'error') {
          setPhase({ kind: 'error', message: auth.message });
          return;
        }
        setPhase({ kind: 'waiting', authUrl: auth.authUrl });
        copyAndOpenUrl(auth.authUrl);
        waitPromise = auth.waitForTokens();
        const result = await waitPromise;
        if (!cancelled) setPhase({ kind: 'success', email: result.email });
      } catch (err) {
        if (!cancelled) {
          setPhase({
            kind: 'error',
            message: err instanceof Error ? err.message : 'Failed to get token',
          });
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      void waitPromise;
    };
  }, [account]);

  useEffect(() => {
    if (phase.kind === 'success') {
      const t = setTimeout(() => exit(0), 1500);
      return () => clearTimeout(t);
    }
    if (phase.kind === 'error') {
      const t = setTimeout(() => exit(1), 1500);
      return () => clearTimeout(t);
    }
    return;
  }, [phase, exit]);

  useInput((_input, _key) => {
    if (phase.kind === 'success') exit(0);
    else if (phase.kind === 'error') exit(1);
  });

  return (
    <Box flexDirection="column">
      <Welcome />
      {phase.kind === 'fetching' ? <Spinner label="Preparing authentication..." /> : null}
      {phase.kind === 'waiting' ? (
        <Box flexDirection="column">
          <Box flexDirection="column" marginBottom={1}>
            <Text>{'🌐 Opening browser...'}</Text>
            <Text color="blue">{'🔗 '}{phase.authUrl}</Text>
            <Text dimColor>{'📋 URL copied to clipboard'}</Text>
          </Box>
          <Spinner label="Waiting for code on port 3434..." />
        </Box>
      ) : null}
      {phase.kind === 'success' ? (
        <SuccessBox title={`Authenticated as ${phase.email}`}>
          <CommandList />
        </SuccessBox>
      ) : null}
      {phase.kind === 'error' ? (
        <ErrorBox
          message={phase.message || 'Failed to authenticate.'}
          hint="Try again, or visit the URL manually."
        />
      ) : null}
    </Box>
  );
}

export async function runAuthJson(account?: string): Promise<number> {
  const auth = await authenticate(account, { forceLogin: true });
  if (auth.type === 'ok') {
    process.stdout.write(`${JSON.stringify({ success: true, email: auth.email })}\n`);
    return 0;
  }
  if (auth.type === 'need_code') {
    process.stdout.write(
      `${JSON.stringify({ success: false, authRequired: true, authUrl: auth.authUrl })}\n`,
    );
    return 1;
  }
  process.stdout.write(`${JSON.stringify({ success: false, error: auth.message })}\n`);
  return 1;
}
