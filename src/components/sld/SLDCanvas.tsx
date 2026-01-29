/**
 * SLDCanvas - Single Line Diagram Canvas Component
 * Main component that renders the complete power flow diagram
 */

import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { SiteNode } from './nodes/SiteNode';
import { SourceNode } from './nodes/SourceNode';
import { PowerFlowEdge } from './edges/PowerFlowEdge';
import {
  SLDCanvasProps,
  SLDData,
  Position,
  SourceNodeData,
  PowerFlowEdgeData,
  sldColors,
} from './types';

// Calculate node positions based on canvas size
const calculatePositions = (
  data: SLDData,
  canvasWidth: number,
  canvasHeight: number
): {
  sitePosition: Position;
  sourcePositions: Map<string, Position>;
} => {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  // Site node at center
  const sitePosition: Position = { x: centerX, y: centerY };

  // Calculate source positions in a semi-circle around the site
  const sourcePositions = new Map<string, Position>();
  const sourceCount = data.sources.length;
  const radius = Math.min(canvasWidth, canvasHeight) * 0.35;

  // Arrange sources in top semi-circle
  data.sources.forEach((source, index) => {
    // Distribute sources evenly in top half (-180 to 0 degrees)
    const angleStep = Math.PI / (sourceCount + 1);
    const angle = Math.PI + angleStep * (index + 1); // Start from left, go right

    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle) - 20; // Offset upward

    sourcePositions.set(source.id, { x, y });
  });

  return { sitePosition, sourcePositions };
};

// Calculate edge connection points
const getEdgePositions = (
  sourcePosition: Position,
  sitePosition: Position
): { start: Position; end: Position } => {
  // Offset from node centers to edges
  const sourceOffset = { x: 0, y: 35 }; // Bottom of source node
  const siteOffset = { x: 0, y: -40 }; // Top of site node

  return {
    start: {
      x: sourcePosition.x + sourceOffset.x,
      y: sourcePosition.y + sourceOffset.y,
    },
    end: {
      x: sitePosition.x + siteOffset.x,
      y: sitePosition.y + siteOffset.y,
    },
  };
};

// Get edge type based on source type
const getEdgeType = (source: SourceNodeData): 'renewable' | 'grid' | 'storage' => {
  switch (source.type) {
    case 'solar':
    case 'wind':
      return 'renewable';
    case 'grid':
    case 'pcs':
      return 'grid';
    case 'battery':
      return 'storage';
    default:
      return 'renewable';
  }
};

export const SLDCanvas: React.FC<SLDCanvasProps> = ({
  data,
  height = 280,
  onNodePress,
  loading = false,
}) => {
  const canvasWidth = 350;

  // Calculate all positions
  const { sitePosition, sourcePositions } = useMemo(
    () => calculatePositions(data, canvasWidth, height),
    [data, canvasWidth, height]
  );

  // Generate edges from sources to site
  const edges = useMemo((): Array<{
    edge: PowerFlowEdgeData;
    start: Position;
    end: Position;
  }> => {
    return data.sources.map((source) => {
      const sourcePos = sourcePositions.get(source.id)!;
      const { start, end } = getEdgePositions(sourcePos, sitePosition);

      return {
        edge: {
          id: `edge-${source.id}-to-site`,
          source: source.id,
          target: data.site.id,
          type: getEdgeType(source),
          animated: source.status !== 'inactive',
        },
        start,
        end,
      };
    });
  }, [data, sourcePositions, sitePosition]);

  if (loading) {
    return (
      <View
        style={{
          height,
          backgroundColor: sldColors.background,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="small" color={sldColors.edges.renewable} />
        <Text
          style={{
            color: sldColors.nodes.source.metric,
            marginTop: 8,
            fontSize: 12,
          }}
        >
          Loading diagram...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        height,
        backgroundColor: sldColors.background,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Dot Grid Background */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.3,
        }}
      >
        {Array.from({ length: Math.ceil(height / 20) }).map((_, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: 'row', height: 20 }}>
            {Array.from({ length: Math.ceil(canvasWidth / 20) }).map((_, colIndex) => (
              <View
                key={colIndex}
                style={{
                  width: 20,
                  height: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    width: 2,
                    height: 2,
                    borderRadius: 1,
                    backgroundColor: sldColors.dotGrid,
                  }}
                />
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Canvas Content */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          width: canvasWidth,
          height,
        }}
        scrollEnabled={false}
      >
        <View style={{ width: canvasWidth, height, position: 'relative' }}>
          {/* Edges (render first, behind nodes) */}
          {edges.map(({ edge, start, end }) => (
            <PowerFlowEdge
              key={edge.id}
              data={edge}
              startPosition={start}
              endPosition={end}
            />
          ))}

          {/* Source Nodes */}
          {data.sources.map((source) => {
            const position = sourcePositions.get(source.id)!;
            return (
              <SourceNode
                key={source.id}
                data={source}
                position={position}
                onPress={() => onNodePress?.(source.id, 'source')}
              />
            );
          })}

          {/* Site Node (render last, on top) */}
          <SiteNode
            data={data.site}
            position={sitePosition}
            onPress={() => onNodePress?.(data.site.id, 'site')}
          />
        </View>
      </ScrollView>

      {/* Legend */}
      <View
        style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          flexDirection: 'row',
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 16,
              height: 2,
              backgroundColor: sldColors.edges.renewable,
              marginRight: 4,
            }}
          />
          <Text style={{ color: sldColors.nodes.source.metric, fontSize: 9 }}>
            Renewable
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 16,
              height: 2,
              backgroundColor: sldColors.edges.grid,
              marginRight: 4,
            }}
          />
          <Text style={{ color: sldColors.nodes.source.metric, fontSize: 9 }}>
            Grid
          </Text>
        </View>
      </View>
    </View>
  );
};

export default SLDCanvas;
