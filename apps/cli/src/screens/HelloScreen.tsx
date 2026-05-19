import { useEffect } from 'react';
import { Box, Text } from 'ink';
import { useExit } from '../runScreen';
import { Welcome } from '../ui/Welcome';
import { Spinner } from '../ui/Spinner';
import { SuccessBox } from '../ui/SuccessBox';

export function HelloScreen(): JSX.Element {
  const exit = useExit();

  useEffect(() => {
    const t = setTimeout(() => exit(0), 300);
    return () => clearTimeout(t);
  }, [exit]);

  return (
    <Box flexDirection="column">
      <Welcome />
      <Spinner label="ink atoms render correctly" />
      <SuccessBox title="ink smoke test passes">
        <Text dimColor>{'  All atoms loaded.'}</Text>
      </SuccessBox>
    </Box>
  );
}
