import { Box, Text } from 'ink';

interface PromptProps {
  label: string;
  defaultValue?: string;
  onSubmit: (value: string) => void;
}

export function Prompt(_props: PromptProps): JSX.Element {
  return (
    <Box>
      <Text dimColor>{'Prompt stub — implemented in Commit 5'}</Text>
    </Box>
  );
}
