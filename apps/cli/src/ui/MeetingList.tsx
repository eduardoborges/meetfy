import { Box, Text } from 'ink';
import type { Meeting } from '../types';

interface MeetingListProps {
  meetings: Meeting[];
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
}

export function MeetingList(_props: MeetingListProps): JSX.Element {
  return (
    <Box>
      <Text dimColor>{'MeetingList stub — implemented in Commit 4'}</Text>
    </Box>
  );
}
