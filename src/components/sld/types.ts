/**
 * TypeScript types for Single Line Diagram (SLD) components
 */

// Power source types
export type PowerSourceType = 'solar' | 'wind' | 'grid' | 'pcs' | 'battery';

// Node position
export interface Position {
  x: number;
  y: number;
}

// Site node data
export interface SiteNodeData {
  id: string;
  name: string;
  load: number;
  icon?: 'factory' | 'building' | 'plant';
}

// Source node data (Solar, Wind, Grid, PCS, Battery)
export interface SourceNodeData {
  id: string;
  type: PowerSourceType;
  power: number;
  q: number;
  pf: number;
  status?: 'active' | 'inactive' | 'warning' | 'error';
}

// Edge/Connection data
export interface PowerFlowEdgeData {
  id: string;
  source: string;
  target: string;
  type: 'renewable' | 'grid' | 'storage';
  animated?: boolean;
  flowDirection?: 'forward' | 'reverse' | 'bidirectional';
}

// Complete SLD data structure
export interface SLDData {
  site: SiteNodeData;
  sources: SourceNodeData[];
  connections: PowerFlowEdgeData[];
}

// SLD Canvas props
export interface SLDCanvasProps {
  data: SLDData;
  height?: number;
  onNodePress?: (nodeId: string, nodeType: 'site' | 'source') => void;
  loading?: boolean;
}

// Node component props
export interface SiteNodeProps {
  data: SiteNodeData;
  position: Position;
  onPress?: () => void;
}

export interface SourceNodeProps {
  data: SourceNodeData;
  position: Position;
  onPress?: () => void;
}

// Edge component props
export interface PowerFlowEdgeProps {
  data: PowerFlowEdgeData;
  startPosition: Position;
  endPosition: Position;
}

// SLD color configuration
export const sldColors = {
  background: '#0D0D0D',
  dotGrid: '#2A2A2A',

  // Edge colors
  edges: {
    renewable: '#00D26A', // Green - Solar/Wind
    grid: '#3498DB',      // Blue - Grid power
    storage: '#9B59B6',   // Purple - Battery
  },

  // Node colors
  nodes: {
    site: {
      background: '#1A1A1A',
      border: '#EF4444',    // Red border for main site
      icon: '#EF4444',
      text: '#FFFFFF',
    },
    source: {
      background: '#1A1A1A',
      border: '#333333',
      text: '#FFFFFF',
      metric: '#A0A0A0',
    },
    solar: {
      icon: '#FFB800',      // Yellow/Orange for solar
      accent: '#FFB800',
    },
    wind: {
      icon: '#00D26A',      // Green for wind
      accent: '#00D26A',
    },
    grid: {
      icon: '#3498DB',      // Blue for grid
      accent: '#3498DB',
    },
    pcs: {
      icon: '#9B59B6',      // Purple for PCS
      accent: '#9B59B6',
    },
    battery: {
      icon: '#1ABC9C',      // Teal for battery
      accent: '#1ABC9C',
    },
  },

  // Status colors
  status: {
    active: '#00D26A',
    inactive: '#666666',
    warning: '#FFB800',
    error: '#FF4757',
  },
};

// Icon mappings for power sources
export const sourceIcons: Record<PowerSourceType, string> = {
  solar: '☀️',
  wind: '💨',
  grid: '⚡',
  pcs: '🔌',
  battery: '🔋',
};

// Labels for power sources
export const sourceLabels: Record<PowerSourceType, string> = {
  solar: 'Solar',
  wind: 'Wind',
  grid: 'Grid',
  pcs: 'PCS',
  battery: 'Battery',
};
