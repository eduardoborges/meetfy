import { Box, Text } from 'ink';
import { Fragment } from 'react';

export interface KeyHintItem {
  key: string;
  label: string;
}

interface KeyHintProps {
  hints: KeyHintItem[];
}

export function KeyHint({ hints }: KeyHintProps): JSX.Element {
  return (
    <Box marginTop={1}>
      {hints.map((h, i) => (
        <Fragment key={`${h.key}-${h.label}`}>
          {i > 0 ? <Text dimColor>{'   '}</Text> : null}
          <Text color="cyan">{h.key}</Text>
          <Text dimColor>{' '}{h.label}</Text>
        </Fragment>
      ))}
    </Box>
  );
}
