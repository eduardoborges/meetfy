import { Box, Text } from 'ink';

interface ErrorBoxProps {
  message: string;
  hint?: string;
}

export function ErrorBox({ message, hint }: ErrorBoxProps): JSX.Element {
  return (
    <Box flexDirection="column" marginY={1}>
      <Text color="red">{'❌ '}{message}</Text>
      {hint ? <Text dimColor>{'   '}{hint}</Text> : null}
    </Box>
  );
}
