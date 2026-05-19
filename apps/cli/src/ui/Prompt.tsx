import { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface PromptProps {
  label: string;
  defaultValue?: string;
  onSubmit: (value: string) => void;
}

export function Prompt({ label, defaultValue = '', onSubmit }: PromptProps): JSX.Element {
  const [value, setValue] = useState('');

  return (
    <Box>
      <Text color="cyan">{'❯ '}</Text>
      <Text>{label}</Text>
      {defaultValue ? <Text dimColor>{' ('}{defaultValue}{')'}</Text> : null}
      <Text>{': '}</Text>
      <TextInput
        value={value}
        onChange={setValue}
        onSubmit={(submitted) => {
          const trimmed = submitted.trim();
          onSubmit(trimmed || defaultValue.trim());
        }}
      />
    </Box>
  );
}
