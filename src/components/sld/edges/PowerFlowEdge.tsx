/**
 * PowerFlowEdge component - Animated connection lines between nodes
 * Shows power flow direction with dashed animated lines
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { sldColors, PowerFlowEdgeProps } from '../types';

export const PowerFlowEdge: React.FC<PowerFlowEdgeProps> = ({
  data,
  startPosition,
  endPosition,
}) => {
  const dashOffset = useRef(new Animated.Value(0)).current;

  // Animate dash offset for flow effect
  useEffect(() => {
    if (data.animated !== false) {
      const animation = Animated.loop(
        Animated.timing(dashOffset, {
          toValue: 20,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      );
      animation.start();
      return () => animation.stop();
    }
  }, [data.animated, dashOffset]);

  const getEdgeColor = (): string => {
    switch (data.type) {
      case 'renewable':
        return sldColors.edges.renewable;
      case 'grid':
        return sldColors.edges.grid;
      case 'storage':
        return sldColors.edges.storage;
      default:
        return sldColors.edges.renewable;
    }
  };

  // Calculate bezier curve control points
  const dx = endPosition.x - startPosition.x;
  const dy = endPosition.y - startPosition.y;

  // Control points for smooth curve
  const cx1 = startPosition.x + dx * 0.5;
  const cy1 = startPosition.y;
  const cx2 = startPosition.x + dx * 0.5;
  const cy2 = endPosition.y;

  // Build SVG path
  const pathData = `M ${startPosition.x} ${startPosition.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endPosition.x} ${endPosition.y}`;

  const edgeColor = getEdgeColor();
  const edgeId = `edge-gradient-${data.id}`;

  // Calculate SVG viewBox dimensions
  const minX = Math.min(startPosition.x, endPosition.x, cx1, cx2) - 20;
  const minY = Math.min(startPosition.y, endPosition.y, cy1, cy2) - 20;
  const maxX = Math.max(startPosition.x, endPosition.x, cx1, cx2) + 20;
  const maxY = Math.max(startPosition.y, endPosition.y, cy1, cy2) + 20;
  const width = maxX - minX;
  const height = maxY - minY;

  return (
    <View
      style={{
        position: 'absolute',
        left: minX,
        top: minY,
        width,
        height,
        pointerEvents: 'none',
      }}
    >
      <Svg width={width} height={height} viewBox={`${minX} ${minY} ${width} ${height}`}>
        <Defs>
          <LinearGradient id={edgeId} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={edgeColor} stopOpacity={0.3} />
            <Stop offset="50%" stopColor={edgeColor} stopOpacity={1} />
            <Stop offset="100%" stopColor={edgeColor} stopOpacity={0.3} />
          </LinearGradient>
        </Defs>

        {/* Background path (glow effect) */}
        <Path
          d={pathData}
          stroke={edgeColor}
          strokeWidth={6}
          strokeOpacity={0.2}
          fill="none"
        />

        {/* Main path */}
        <Path
          d={pathData}
          stroke={`url(#${edgeId})`}
          strokeWidth={2}
          strokeDasharray={data.animated !== false ? '8,4' : undefined}
          fill="none"
        />

        {/* Flow dot indicator */}
        {data.animated !== false && (
          <Path
            d={pathData}
            stroke={edgeColor}
            strokeWidth={4}
            strokeDasharray="2,18"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </Svg>
    </View>
  );
};

export default PowerFlowEdge;
