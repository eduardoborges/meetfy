import { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import open from 'open';
import type { Meeting } from '../types';
import { useExit } from '../runScreen';
import { Welcome } from '../ui/Welcome';
import { Spinner } from '../ui/Spinner';
import { ErrorBox } from '../ui/ErrorBox';
import { KeyHint } from '../ui/KeyHint';
import { MeetingList } from '../ui/MeetingList';
import { MeetingDetails } from '../ui/MeetingCard';
import { useAsync } from '../ui/useAsync';
import { getMergedUpcomingMeetings } from '../meetings';
import { writeClipboard } from '../clipboard';

interface NextScreenProps {
  account?: string;
}

export function NextScreen({ account }: NextScreenProps): JSX.Element {
  const exit = useExit();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const state = useAsync<Meeting[]>(async () => {
    const result = await getMergedUpcomingMeetings(account, 10);
    if (result.accounts.length === 0 || result.failedAccounts.length === result.accounts.length) {
      throw new Error('auth_required');
    }
    return result.meetings;
  }, [account]);

  const meetings = state.data ?? [];
  const selected = meetings[selectedIndex];

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1500);
    return () => clearTimeout(t);
  }, [toast]);

  useInput((input, key) => {
    if (state.loading) return;
    if (state.error) {
      exit(1);
      return;
    }
    if (meetings.length === 0) {
      exit(0);
      return;
    }
    if (input === 'q' || key.escape) {
      exit(0);
      return;
    }
    if (input === 'j' || key.downArrow) {
      setSelectedIndex((i) => Math.min(i + 1, meetings.length - 1));
      return;
    }
    if (input === 'k' || key.upArrow) {
      setSelectedIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (key.return && selected?.hangoutLink) {
      open(selected.hangoutLink).catch(() => {});
      setToast('Opened in browser');
      return;
    }
    if (input === 'c' && selected?.hangoutLink) {
      writeClipboard(selected.hangoutLink).catch(() => {});
      setToast('Link copied');
      return;
    }
  });

  return (
    <Box flexDirection="column">
      <Welcome />
      {state.loading ? <Spinner label="Loading meetings..." /> : null}
      {!state.loading && state.error ? (
        <ErrorBox
          message="Failed to reach Google Calendar."
          hint="Try again, or check `meetfy auth`."
        />
      ) : null}
      {!state.loading && !state.error && meetings.length === 0 ? (
        <Box flexDirection="column" marginY={1}>
          <Text color="yellow">📭 No upcoming meetings found.</Text>
          <Text dimColor>Press any key to exit.</Text>
        </Box>
      ) : null}
      {!state.loading && !state.error && meetings.length > 0 ? (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text dimColor>Upcoming meetings across accounts ({meetings.length})</Text>
          </Box>
          <MeetingList meetings={meetings} selectedIndex={selectedIndex} />
          {selected ? <MeetingDetails meeting={selected} /> : null}
          {toast ? (
            <Box marginTop={1}>
              <Text color="green">{'✓ '}{toast}</Text>
            </Box>
          ) : null}
          <KeyHint
            hints={[
              { key: '↑↓', label: 'Navigate' },
              { key: '↵', label: 'Open link' },
              { key: 'c', label: 'Copy link' },
              { key: 'q', label: 'Quit' },
            ]}
          />
        </Box>
      ) : null}
    </Box>
  );
}

export async function runNextJson(account?: string): Promise<number> {
  const result = await getMergedUpcomingMeetings(account, 10);
  if (result.accounts.length === 0 || result.failedAccounts.length === result.accounts.length) {
    process.stdout.write(`${JSON.stringify({ success: false, error: 'auth_required' })}\n`);
    return 1;
  }
  process.stdout.write(
    `${JSON.stringify({
      success: true,
      meeting: result.meetings[0] ?? null,
      meetings: result.meetings,
      accounts: result.accounts,
      failedAccounts: result.failedAccounts,
    })}\n`,
  );
  return 0;
}
