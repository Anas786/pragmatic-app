import { FC } from "react";
import { IconProps } from "src/types";
import { ACCENT_GREEN, ACCENT_RED } from "src/utils/theme";
import { BoltIcon, ChartIcon, SproutIcon, RollercosterIcon } from "src/assets/icons";

export interface SummaryMetricItem {
  label: string;
  value: string;
  unit?: string;
  iconName: FC<IconProps>;
  iconColor: string;
  accentColor: string;
}

export const mockYieldMetrics: SummaryMetricItem[] = [
  {
    label: "Total Plant Yeild",
    value: "106,104.46",
    unit: "mWh",
    iconName: BoltIcon,
    iconColor: ACCENT_GREEN,
    accentColor: ACCENT_GREEN,
  },
  {
    label: "Revenue",
    value: "20,159,846.83",
    unit: "USD",
    iconName: ChartIcon,
    iconColor: ACCENT_GREEN,
    accentColor: ACCENT_GREEN,
  },
];

export const mockEnvironmentalMetrics: SummaryMetricItem[] = [
  {
    label: "CO₂ Reduction",
    value: "22,529.16",
    unit: "Tons",
    iconName: SproutIcon,
    iconColor: ACCENT_GREEN,
    accentColor: ACCENT_GREEN,
  },
  {
    label: "Coal Saved",
    value: "50,865,032.12",
    unit: "Tons",
    iconName: RollercosterIcon,
    iconColor: ACCENT_RED,
    accentColor: ACCENT_RED,
  },
  {
    label: "Trees Planted",
    value: "120,573,246.59",
    unit: "Nos.",
    iconName: SproutIcon,
    iconColor: ACCENT_GREEN,
    accentColor: ACCENT_GREEN,
  },
];
