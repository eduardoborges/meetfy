import { Box, Text } from 'ink';
import type { Meeting } from '../types';

interface MeetingCardProps {
  meeting: Meeting;
  selected?: boolean;
}

export function MeetingCard({ meeting, selected = false }: MeetingCardProps): JSX.Element {
  const marker = selected ? '❯' : ' ';
  const titleColor = selected ? 'cyan' : undefined;
  return (
    <Box flexDirection="row">
      <Text color={selected ? 'cyan' : undefined}>{marker}{' '}</Text>
      <Box flexDirection="column" flexGrow={1}>
        <Text color={titleColor} bold={selected}>{meeting.title}</Text>
        <Text dimColor>{'  '}{meeting.startTime}{' – '}{meeting.endTime}</Text>
        {meeting.accountEmail ? <Text dimColor>{'  '}{meeting.accountEmail}</Text> : null}
      </Box>
    </Box>
  );
}

export function MeetingDetails({ meeting }: { meeting: Meeting }): JSX.Element {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="cyan" bold>{meeting.title}</Text>
      <Text dimColor>{'🕐 '}{meeting.startTime}{' – '}{meeting.endTime}</Text>
      {meeting.accountEmail ? <Text dimColor>{'👤 '}{meeting.accountEmail}</Text> : null}
      {meeting.hangoutLink ? <Text color="blue">{'🔗 '}{meeting.hangoutLink}</Text> : null}
      {meeting.location ? <Text dimColor>{'📍 '}{meeting.location}</Text> : null}
    </Box>
  );
}
