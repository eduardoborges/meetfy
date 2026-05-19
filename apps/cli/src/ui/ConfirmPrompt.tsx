import { Box, Text } from 'ink';

interface ConfirmPromptProps {
  question: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmPrompt(_props: ConfirmPromptProps): JSX.Element {
  return (
    <Box>
      <Text dimColor>{'ConfirmPrompt stub — implemented in Commit 3'}</Text>
    </Box>
  );
}
