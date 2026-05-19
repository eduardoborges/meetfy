import { Box, Text } from 'ink';
import type { Meeting } from '../types';

interface MeetingCardProps {
  meeting: Meeting;
  selected?: boolean;
}

export function MeetingCard(_props: MeetingCardProps): JSX.Element {
  return (
    <Box>
      <Text dimColor>{'MeetingCard stub — implemented in Commit 4'}</Text>
    </Box>
  );
}
