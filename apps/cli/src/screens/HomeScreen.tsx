import { useCallback, useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import Divider from 'ink-divider';
import { Tab, Tabs } from 'ink-tab';
import Table from 'ink-table';
import { TitledBox, titleStyles } from '@mishieck/ink-titled-box';
import type { Meeting } from '../types';
import { authenticate } from '../auth';
import { copyAndOpenUrl } from '../browser';
import { getMergedUpcomingMeetings } from '../meetings';
import { getActiveAccount, listAccounts, removeAccount, setActiveAccount } from '../config';
import { useExit } from '../runScreen';
import { ErrorBox } from '../ui/ErrorBox';
import { KeyHint } from '../ui/KeyHint';
import { Spinner } from '../ui/Spinner';
import { SuccessBox } from '../ui/SuccessBox';
import { Welcome } from '../ui/Welcome';

type MeetingsState =
  | { status: 'loading' }
  | { status: 'ready'; meetings: Meeting[]; failedAccounts: string[] }
  | { status: 'error'; message: string };

type Phase =
  | { kind: 'home' }
  | { kind: 'auth'; authUrl?: string }
  | { kind: 'remove' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

interface MeetingRow extends Record<string, string> {
  time: string;
  title: string;
  account: string;
}

function sortedAccounts(): string[] {
  return listAccounts();
}

function clampIndex(index: number, accounts: string[]): number {
  const tabCount = accounts.length + 1;
  return Math.min(Math.max(index, 0), tabCount - 1);
}

function compactEmail(email: string): string {
  if (email.length <= 24) return email;
  return `${email.slice(0, 10)}…${email.slice(-11)}`;
}

function meetingRows(meetings: Meeting[]): MeetingRow[] {
  return meetings.map((meeting) => ({
    time: meeting.startTime,
    title: meeting.title,
    account: meeting.accountEmail ? compactEmail(meeting.accountEmail) : '',
  }));
}

export function HomeScreen(): JSX.Element {
  const exit = useExit();
  const [phase, setPhase] = useState<Phase>({ kind: 'home' });
  const [accounts, setAccounts] = useState<string[]>(() => sortedAccounts());
  const [active, setActive] = useState<string | null>(() => getActiveAccount());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [meetingsState, setMeetingsState] = useState<MeetingsState>({ status: 'loading' });

  const selectedAccount = selectedIndex === 0 ? null : accounts[clampIndex(selectedIndex, accounts) - 1];
  const selectedLabel = selectedAccount ? compactEmail(selectedAccount) : 'All';

  const reloadAccounts = useCallback((): void => {
    const nextAccounts = sortedAccounts();
    setAccounts(nextAccounts);
    setActive(getActiveAccount());
    setSelectedIndex((index) => clampIndex(index, nextAccounts));
  }, []);

  const loadMeetings = useCallback((): void => {
    setMeetingsState({ status: 'loading' });
    void (async () => {
      try {
        const result = await getMergedUpcomingMeetings(selectedAccount ?? undefined, 8);
        setMeetingsState({
          status: 'ready',
          meetings: result.meetings,
          failedAccounts: result.failedAccounts,
        });
      } catch (err) {
        setMeetingsState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to load meetings',
        });
      }
    })();
  }, [selectedAccount]);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  useEffect(() => {
    if (phase.kind !== 'success') return;
    const timer = setTimeout(() => setPhase({ kind: 'home' }), 1200);
    return () => clearTimeout(timer);
  }, [phase]);

  const startAuth = useCallback(async (): Promise<void> => {
    setPhase({ kind: 'auth' });
    const auth = await authenticate(undefined, { forceLogin: true });
    if (auth.type === 'error') {
      setPhase({ kind: 'error', message: auth.message });
      return;
    }
    if (auth.type === 'ok') {
      reloadAccounts();
      setPhase({ kind: 'success', message: `Authenticated as ${auth.email}` });
      return;
    }
    setPhase({ kind: 'auth', authUrl: auth.authUrl });
    copyAndOpenUrl(auth.authUrl);
    const result = await auth.waitForTokens();
    reloadAccounts();
    loadMeetings();
    setPhase({ kind: 'success', message: `Authenticated as ${result.email}` });
  }, [loadMeetings, reloadAccounts]);

  useInput((input, key) => {
    if (phase.kind === 'auth') return;
    if (phase.kind === 'success') {
      setPhase({ kind: 'home' });
      return;
    }
    if (phase.kind === 'error') {
      setPhase({ kind: 'home' });
      return;
    }
    if (phase.kind === 'remove') {
      if (input === 'y' || input === 'Y') {
        if (selectedAccount) {
          removeAccount(selectedAccount);
          reloadAccounts();
          loadMeetings();
          setPhase({ kind: 'success', message: `Removed ${selectedAccount}` });
        } else {
          setPhase({ kind: 'home' });
        }
        return;
      }
      if (input === 'n' || input === 'N' || key.escape) {
        setPhase({ kind: 'home' });
      }
      return;
    }

    if (input === 'q' || key.escape) {
      exit(0);
      return;
    }
    if (input === 'a') {
      void startAuth().catch((err: unknown) => {
        setPhase({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Failed to authenticate',
        });
      });
      return;
    }
    if (input === 'r' && selectedAccount) {
      setPhase({ kind: 'remove' });
      return;
    }
    if ((input === 'u' || key.return) && selectedAccount) {
      setActiveAccount(selectedAccount);
      reloadAccounts();
      setPhase({ kind: 'success', message: `Active account: ${selectedAccount}` });
    }
  });

  return (
    <Box flexDirection="column">
      <Welcome />

      {phase.kind === 'auth' ? (
        <Box flexDirection="column" marginY={1}>
          {phase.authUrl ? (
            <>
              <Text>{'🌐 Opening browser...'}</Text>
              <Text color="blue">{'🔗 '}{phase.authUrl}</Text>
              <Text dimColor>{'📋 URL copied to clipboard'}</Text>
            </>
          ) : null}
          <Spinner label="Waiting for Google authentication..." />
        </Box>
      ) : null}

      {phase.kind === 'success' ? <SuccessBox title={phase.message} /> : null}

      {phase.kind === 'error' ? (
        <ErrorBox message={phase.message} hint="Press any key to return to the dashboard." />
      ) : null}

      {phase.kind === 'remove' && selectedAccount ? (
        <Box flexDirection="column" marginY={1}>
          <Text>Remove {selectedAccount}?</Text>
          <Text dimColor>Local tokens for this account will be deleted.</Text>
          <KeyHint hints={[
            { key: 'y', label: 'Remove' },
            { key: 'n / Esc', label: 'Cancel' },
          ]} />
        </Box>
      ) : null}

      {phase.kind === 'home' ? (
        <Box flexDirection="column">
          <TitledBox
            borderStyle="round"
            borderColor="gray"
            titleStyles={titleStyles.rectangle}
            titles={['Calendar']}
            paddingX={1}
            marginBottom={1}
          >
            {accounts.length === 0 ? (
              <Text dimColor>No authenticated accounts.</Text>
            ) : (
              <Tabs
                showIndex={false}
                keyMap={{
                  useTab: false,
                  useNumbers: false,
                  previous: ['left', 'h'],
                  next: ['right', 'l'],
                }}
                colors={{ activeTab: { color: 'cyan', backgroundColor: 'black' } }}
                onChange={(name) => {
                  const nextIndex = name === 'all' ? 0 : accounts.indexOf(name) + 1;
                  setSelectedIndex(clampIndex(nextIndex, accounts));
                }}
              >
                {[
                  <Tab key="all" name="all">All</Tab>,
                  ...accounts.map((email) => (
                    <Tab key={email} name={email}>
                      {compactEmail(email)}
                      {email === active ? ' *' : ''}
                    </Tab>
                  )),
                ]}
              </Tabs>
            )}
          </TitledBox>

          <Divider title={`Upcoming meetings · ${selectedLabel}`} titleColor="cyan" />

          <TitledBox
            borderStyle="round"
            borderColor="gray"
            titleStyles={titleStyles.rectangle}
            titles={[selectedAccount ?? 'All accounts']}
            paddingX={1}
            marginBottom={1}
          >
            {accounts.length === 0 ? <Text dimColor>Add an account to load meetings.</Text> : null}
            {accounts.length > 0 && meetingsState.status === 'loading' ? (
              <Spinner label={selectedAccount ? `Loading ${selectedLabel}...` : 'Loading all accounts...'} />
            ) : null}
            {accounts.length > 0 && meetingsState.status === 'error' ? (
              <Text color="red">Failed to load meetings: {meetingsState.message}</Text>
            ) : null}
            {accounts.length > 0 && meetingsState.status === 'ready' ? (
              <>
                {meetingsState.failedAccounts.length > 0 ? (
                  <Text color="yellow">Skipped: {meetingsState.failedAccounts.join(', ')}</Text>
                ) : null}
                {meetingsState.meetings.length > 0 ? (
                  <Table
                    data={meetingRows(meetingsState.meetings)}
                    columns={selectedAccount ? ['time', 'title'] : ['time', 'title', 'account']}
                    padding={1}
                  />
                ) : (
                  <Text dimColor>No upcoming meetings found.</Text>
                )}
              </>
            ) : null}
          </TitledBox>

          <KeyHint hints={[
            { key: '←→/hl', label: 'Switch tab' },
            { key: 'Enter/u', label: 'Use' },
            { key: 'a', label: 'Add account' },
            { key: 'r', label: 'Remove' },
            { key: 'q', label: 'Quit' },
          ]} />
        </Box>
      ) : null}
    </Box>
  );
}
