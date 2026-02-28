import { FC } from "react";
import { IconProps } from "src/types";
import { SolarIcon } from "src/assets/icons";
import { FanIcon } from "src/assets/icons";
import { GridIcon } from "src/assets/icons";
import { ChartIcon } from "src/assets/icons";
import {
  ACCENT_GREEN,
  ACCENT_RED,
  ACCENT_BLUE,
  GRADIENT_YELLOW,
} from "src/utils";

export interface MetricItem {
  label: string;
  value: string;
  unit: string;
  IconComponent: FC<IconProps>;
  color: string;
}

export interface SiteCardData {
  name: string;
  timestamp: string;
  efficiency: number;
  metrics: MetricItem[];
  image: any;
}


export const mockSitesData: SiteCardData[] = [
  {
    name: "Lucky Cement Nooribad",
    timestamp: "17/12/2025, 07:49 PM",
    efficiency: 86.56,
    metrics: [
      {
        label: "Solar",
        value: "3.2345",
        unit: "kWp",
        IconComponent: SolarIcon,
        color: ACCENT_GREEN,
      },
      {
        label: "Wind",
        value: "3.2345",
        unit: "kWp",
        IconComponent: FanIcon,
        color: ACCENT_BLUE,
      },
      {
        label: "Grid",
        value: "4,553.2",
        unit: "kWp",
        IconComponent: GridIcon,
        color: ACCENT_RED,
      },
      {
        label: "Solar",
        value: "3.2345",
        unit: "kWp",
        IconComponent: SolarIcon,
        color: ACCENT_GREEN,
      },
      {
        label: "Solar",
        value: "3.2345",
        unit: "kWp",
        IconComponent: SolarIcon,
        color: ACCENT_GREEN,
      },
      {
        label: "PV Size",
        value: "18,235",
        unit: "kW",
        IconComponent: ChartIcon,
        color: GRADIENT_YELLOW,
      },
      {
        label: "PV Size",
        value: "18,235",
        unit: "kW",
        IconComponent: ChartIcon,
        color: GRADIENT_YELLOW,
      },
      {
        label: "Wind",
        value: "3.2345",
        unit: "kWp",
        IconComponent: FanIcon,
        color: ACCENT_BLUE,
      },
      {
        label: "Solar",
        value: "3.2345",
        unit: "kWp",
        IconComponent: SolarIcon,
        color: ACCENT_GREEN,
      },
    ],
    image: require("../../assets/images/companylogo1.png"),
  },
  {
    name: "Master Molty Foam",
    timestamp: "17/12/2025, 07:49 PM",
    efficiency: 86.56,
    metrics: [
      {
        label: "Solar",
        value: "3.2345",
        unit: "kWp",
        IconComponent: SolarIcon,
        color: ACCENT_GREEN,
      },
      {
        label: "Solar",
        value: "3.2345",
        unit: "kWp",
        IconComponent: SolarIcon,
        color: ACCENT_GREEN,
      },
      {
        label: "PV Size",
        value: "18,235",
        unit: "kW",
        IconComponent: ChartIcon,
        color: GRADIENT_YELLOW,
      },
      {
        label: "PV Size",
        value: "18,235",
        unit: "kW",
        IconComponent: ChartIcon,
        color: GRADIENT_YELLOW,
      },
      {
        label: "Wind",
        value: "3.2345",
        unit: "kWp",
        IconComponent: FanIcon,
        color: ACCENT_BLUE,
      },
      {
        label: "Solar",
        value: "3.2345",
        unit: "kWp",
        IconComponent: SolarIcon,
        color: ACCENT_GREEN,
      },
    ],
    image: require("../../assets/images/companylogo2.png"),
  },
  {
    name: "Young Food Pvt.",
    timestamp: "17/12/2025, 07:49 PM",
    efficiency: 86.56,
    metrics: [
      {
        label: "PV Size",
        value: "18,235",
        unit: "kW",
        IconComponent: ChartIcon,
        color: GRADIENT_YELLOW,
      },
      {
        label: "Solar",
        value: "3.2345",
        unit: "kWp",
        IconComponent: SolarIcon,
        color: ACCENT_GREEN,
      },
      {
        label: "Solar",
        value: "3.2345",
        unit: "kWp",
        IconComponent: SolarIcon,
        color: ACCENT_GREEN,
      },
    ],
    image: require("../../assets/images/companylogo3.png"),
  },
];
