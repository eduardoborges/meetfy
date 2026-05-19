import { Box, Text } from 'ink';
import type { ReactNode } from 'react';

interface SuccessBoxProps {
  title: string;
  children?: ReactNode;
}

export function SuccessBox({ title, children }: SuccessBoxProps): JSX.Element {
  return (
    <Box flexDirection="column" marginY={1}>
      <Text color="green">{'✓ '}{title}</Text>
      {children ? <Box flexDirection="column" marginTop={1}>{children}</Box> : null}
    </Box>
  );
}
