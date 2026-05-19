import { Box, Text } from 'ink';
import InkSpinner from 'ink-spinner';

interface SpinnerProps {
  label: string;
  color?: string;
}

export function Spinner({ label, color = 'cyan' }: SpinnerProps): JSX.Element {
  return (
    <Box>
      <Text color={color}>
        <InkSpinner type="dots" />
      </Text>
      <Text>{' '}{label}</Text>
    </Box>
  );
}
