import { useEffect } from 'react';
import { Box, Text } from 'ink';
import { useExit } from '../runScreen';

export function HelloScreen(): JSX.Element {
  const exit = useExit();

  useEffect(() => {
    const t = setTimeout(() => exit(0), 200);
    return () => clearTimeout(t);
  }, [exit]);

  return (
    <Box flexDirection="column" marginY={1}>
      <Text color="cyan" bold>  Meetfy</Text>
      <Text dimColor>  ink smoke test — bundle works</Text>
    </Box>
  );
}
