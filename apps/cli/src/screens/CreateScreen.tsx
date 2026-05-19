import { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { OAuth2Client } from 'google-auth-library';
import type { Meeting } from '../types';
import { useExit } from '../runScreen';
import { Welcome } from '../ui/Welcome';
import { Spinner } from '../ui/Spinner';
import { ErrorBox } from '../ui/ErrorBox';
import { SuccessBox } from '../ui/SuccessBox';
import { StepIndicator } from '../ui/StepIndicator';
import { KeyHint } from '../ui/KeyHint';
import { Prompt } from '../ui/Prompt';
import { createMeeting } from '../calendar';
import { authenticate, type AuthResult } from '../auth';
import { writeClipboard } from '../clipboard';

interface CreateScreenOpts {
  title?: string;
  description?: string;
  participants?: string;
}

interface CreateScreenProps extends CreateScreenOpts {
  client: OAuth2Client;
}

interface FormData {
  title: string;
  description: string;
  participants: string;
}

type Phase =
  | { kind: 'title' }
  | { kind: 'description' }
  | { kind: 'participants' }
  | { kind: 'confirm' }
  | { kind: 'creating' }
  | { kind: 'success'; meeting: Meeting }
  | { kind: 'error'; message: string };

const TITLE_DEFAULT = 'Instant Meeting';
const DESC_DEFAULT = 'Instant meeting created via Meetfy CLI';

function pickInitialPhase(opts: CreateScreenOpts): { phase: Phase; data: FormData } {
  const data: FormData = {
    title: opts.title?.trim() || '',
    description: opts.description?.trim() || '',
    participants: opts.participants ?? '',
  };
  if (!data.title) return { phase: { kind: 'title' }, data };
  if (!data.description) return { phase: { kind: 'description' }, data };
  if (opts.participants === undefined) return { phase: { kind: 'participants' }, data };
  return { phase: { kind: 'confirm' }, data };
}

function totalSteps(opts: CreateScreenOpts): number {
  let n = 0;
  if (!opts.title?.trim()) n++;
  if (!opts.description?.trim()) n++;
  if (opts.participants === undefined) n++;
  return n;
}

function currentStepNumber(phase: Phase, opts: CreateScreenOpts): number | null {
  const steps: Phase['kind'][] = [];
  if (!opts.title?.trim()) steps.push('title');
  if (!opts.description?.trim()) steps.push('description');
  if (opts.participants === undefined) steps.push('participants');
  const idx = steps.indexOf(phase.kind);
  return idx >= 0 ? idx + 1 : null;
}

export function CreateScreen({ client, ...opts }: CreateScreenProps): JSX.Element {
  const exit = useExit();
  const initial = pickInitialPhase(opts);
  const [phase, setPhase] = useState<Phase>(initial.phase);
  const [data, setData] = useState<FormData>(initial.data);

  const promptSteps: Phase['kind'][] = ['title', 'description', 'participants'];
  const isPrompt = promptSteps.includes(phase.kind);

  useInput(
    (input, key) => {
      if (phase.kind === 'confirm') {
        if (key.return) {
          setPhase({ kind: 'creating' });
          void runCreate();
          return;
        }
        if (key.escape) {
          exit(0);
        }
        return;
      }
      if (phase.kind === 'success' || phase.kind === 'error') {
        exit(phase.kind === 'success' ? 0 : 1);
      }
    },
    { isActive: !isPrompt && phase.kind !== 'creating' },
  );

  useEffect(() => {
    if (phase.kind !== 'success') return;
    if (!phase.meeting.hangoutLink) return;
    writeClipboard(phase.meeting.hangoutLink).catch(() => {});
  }, [phase]);

  const advanceFromTitle = (value: string): void => {
    const next: FormData = { ...data, title: value };
    setData(next);
    if (!next.description && opts.description === undefined) {
      setPhase({ kind: 'description' });
    } else if (opts.participants === undefined) {
      setPhase({ kind: 'participants' });
    } else {
      setPhase({ kind: 'confirm' });
    }
  };

  const advanceFromDescription = (value: string): void => {
    const next: FormData = { ...data, description: value };
    setData(next);
    if (opts.participants === undefined) {
      setPhase({ kind: 'participants' });
    } else {
      setPhase({ kind: 'confirm' });
    }
  };

  const advanceFromParticipants = (value: string): void => {
    const next: FormData = { ...data, participants: value };
    setData(next);
    setPhase({ kind: 'confirm' });
  };

  const runCreate = async (): Promise<void> => {
    const participantsList = data.participants
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    const result = await createMeeting(client, {
      title: data.title || TITLE_DEFAULT,
      description: data.description || DESC_DEFAULT,
      participants: participantsList,
    });
    if (result) setPhase({ kind: 'success', meeting: result });
    else
      setPhase({
        kind: 'error',
        message: 'Failed to create meeting. Run `meetfy auth` if needed.',
      });
  };

  const total = totalSteps(opts);
  const current = currentStepNumber(phase, opts);

  return (
    <Box flexDirection="column">
      <Welcome />
      {current !== null && total > 0 ? (
        <Box marginBottom={1}>
          <StepIndicator current={current} total={total} />
        </Box>
      ) : null}

      {phase.kind === 'title' ? (
        <Prompt label="Meeting title" defaultValue={TITLE_DEFAULT} onSubmit={advanceFromTitle} />
      ) : null}
      {phase.kind === 'description' ? (
        <Prompt
          label="Meeting description"
          defaultValue={DESC_DEFAULT}
          onSubmit={advanceFromDescription}
        />
      ) : null}
      {phase.kind === 'participants' ? (
        <Prompt
          label="Participant emails (comma-separated)"
          defaultValue=""
          onSubmit={advanceFromParticipants}
        />
      ) : null}

      {phase.kind === 'confirm' ? (
        <Box flexDirection="column" marginY={1}>
          <Text>About to create:</Text>
          <Box marginLeft={2} flexDirection="column" marginTop={1}>
            <Text>
              <Text dimColor>Title:        </Text>
              {data.title || TITLE_DEFAULT}
            </Text>
            <Text>
              <Text dimColor>Description:  </Text>
              {data.description || DESC_DEFAULT}
            </Text>
            <Text>
              <Text dimColor>Participants: </Text>
              {data.participants.trim() || <Text dimColor>(none)</Text>}
            </Text>
          </Box>
          <KeyHint hints={[
            { key: '↵', label: 'Create' },
            { key: 'Esc', label: 'Cancel' },
          ]} />
        </Box>
      ) : null}

      {phase.kind === 'creating' ? <Spinner label="Creating meeting..." /> : null}

      {phase.kind === 'success' ? (
        <SuccessBox title="Meeting created!">
          <Text color="cyan">{'📅 '}{phase.meeting.title}</Text>
          {phase.meeting.hangoutLink ? (
            <Text color="blue">{'🔗 '}{phase.meeting.hangoutLink}</Text>
          ) : null}
          <Text dimColor>{'⏰ '}{phase.meeting.startTime}{' – '}{phase.meeting.endTime}</Text>
          {phase.meeting.hangoutLink ? <Text dimColor>{'📋 Link copied to clipboard'}</Text> : null}
          <Box marginTop={1}>
            <Text dimColor>Press any key to exit.</Text>
          </Box>
        </SuccessBox>
      ) : null}

      {phase.kind === 'error' ? (
        <Box flexDirection="column">
          <ErrorBox message={phase.message} />
          <Text dimColor>Press any key to exit.</Text>
        </Box>
      ) : null}
    </Box>
  );
}

export async function runCreateJson(opts: CreateScreenOpts): Promise<number> {
  const auth: AuthResult = await authenticate();
  if (auth.type !== 'ok') {
    const error =
      auth.type === 'error' ? auth.message : 'auth_required';
    process.stdout.write(`${JSON.stringify({ success: false, error })}\n`);
    return 1;
  }
  const title = opts.title?.trim() || TITLE_DEFAULT;
  const description = opts.description?.trim() || DESC_DEFAULT;
  const participants = (opts.participants ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  const result = await createMeeting(auth.client, { title, description, participants });
  if (result) {
    process.stdout.write(`${JSON.stringify({ success: true, meeting: result })}\n`);
    return 0;
  }
  process.stdout.write(`${JSON.stringify({ success: false, error: 'Failed to create meeting' })}\n`);
  return 1;
}
