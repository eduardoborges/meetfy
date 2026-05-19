import { Text } from 'ink';

interface StepIndicatorProps {
  current: number;
  total: number;
}

export function StepIndicator({ current, total }: StepIndicatorProps): JSX.Element {
  return <Text dimColor>{'Step '}{current}{' of '}{total}</Text>;
}
