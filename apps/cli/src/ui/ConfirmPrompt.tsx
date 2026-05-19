import { Box, Text, useInput } from 'ink';
import type { ReactNode } from 'react';
import { KeyHint } from './KeyHint';

interface ConfirmPromptProps {
  question: string;
  description?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmPrompt({
  question,
  description,
  onConfirm,
  onCancel,
}: ConfirmPromptProps): JSX.Element {
  useInput((input, key) => {
    if (input === 'y' || input === 'Y') onConfirm();
    else if (input === 'n' || input === 'N' || key.escape) onCancel();
  });

  return (
    <Box flexDirection="column" marginY={1}>
      <Text>{question}</Text>
      {description ? <Box marginTop={1}>{description}</Box> : null}
      <KeyHint hints={[
        { key: 'y', label: 'Confirm' },
        { key: 'n / Esc', label: 'Cancel' },
      ]} />
    </Box>
  );
}
