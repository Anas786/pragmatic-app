import React, { FC } from 'react';
import { Pill } from 'src/components/common';

interface ReportFilterPillProps {
  active: boolean;
  /** Internal filter key ('Custom' / 'Month' / 'Year' / 'Life Time'). */
  label: string;
  onPress: () => void;
}

/** 'Life Time' stays the internal switch key; users always see 'Lifetime'. */
const displayLabel = (label: string): string => (label === 'Life Time' ? 'Lifetime' : label);

/**
 * Period filter pill for Reports / Tables / Trends — a radio `Pill`
 * (brand fill + dark ink when selected, 'select' haptic only on change).
 * Wrap the row in `PillGroup` for radio-group semantics and position.
 */
const ReportFilterPill: FC<ReportFilterPillProps> = ({ active, label, onPress }) => (
  <Pill role="radio" label={displayLabel(label)} selected={active} onPress={onPress} />
);

export default ReportFilterPill;
