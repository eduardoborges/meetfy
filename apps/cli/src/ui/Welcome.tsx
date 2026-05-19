import { Box, Text } from 'ink';

export function Welcome(): JSX.Element {
  return (
    <Box flexDirection="column" marginY={1}>
      <Text color="cyan" bold>{'  Meetfy'}</Text>
      <Text dimColor>{'  Instant Meeting Creator — reserve time in Google Calendar'}</Text>
    </Box>
  );
}
