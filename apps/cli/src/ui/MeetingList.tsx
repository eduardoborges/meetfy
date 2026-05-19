import { Box } from 'ink';
import type { Meeting } from '../types';
import { MeetingCard } from './MeetingCard';

interface MeetingListProps {
  meetings: Meeting[];
  selectedIndex: number;
}

export function MeetingList({ meetings, selectedIndex }: MeetingListProps): JSX.Element {
  return (
    <Box flexDirection="column">
      {meetings.map((m, i) => (
        <MeetingCard
          key={m.id || `${m.title}-${i}`}
          meeting={m}
          selected={i === selectedIndex}
        />
      ))}
    </Box>
  );
}
