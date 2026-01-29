/**
 * SourceNode component - Power source nodes (Solar, Wind, Grid, PCS, Battery)
 * Displays power source with metrics (Q, PF)
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { sldColors, sourceIcons, sourceLabels, SourceNodeProps, PowerSourceType } from '../types';

export const SourceNode: React.FC<SourceNodeProps> = ({ data, position, onPress }) => {
  const getAccentColor = (type: PowerSourceType): string => {
    return sldColors.nodes[type]?.accent || sldColors.nodes.source.border;
  };

  const getStatusColor = (): string => {
    switch (data.status) {
      case 'active':
        return sldColors.status.active;
      case 'inactive':
        return sldColors.status.inactive;
      case 'warning':
        return sldColors.status.warning;
      case 'error':
        return sldColors.status.error;
      default:
        return sldColors.status.active;
    }
  };

  const accentColor = getAccentColor(data.type);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        transform: [{ translateX: -50 }, { translateY: -35 }],
      }}
    >
      <View
        style={{
          width: 100,
          backgroundColor: sldColors.nodes.source.background,
          borderWidth: 1,
          borderColor: accentColor,
          borderRadius: 10,
          padding: 10,
          alignItems: 'center',
        }}
      >
        {/* Status Indicator */}
        <View
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: getStatusColor(),
          }}
        />

        {/* Icon */}
        <Text style={{ fontSize: 24, marginBottom: 4 }}>
          {sourceIcons[data.type]}
        </Text>

        {/* Source Label */}
        <Text
          style={{
            color: accentColor,
            fontSize: 10,
            fontWeight: '600',
            marginBottom: 4,
          }}
        >
          {sourceLabels[data.type]}
        </Text>

        {/* Power Value */}
        <Text
          style={{
            color: sldColors.nodes.source.text,
            fontSize: 14,
            fontWeight: 'bold',
          }}
        >
          {data.power.toFixed(1)}
        </Text>
        <Text
          style={{
            color: sldColors.nodes.source.metric,
            fontSize: 9,
            marginBottom: 6,
          }}
        >
          kW
        </Text>

        {/* Metrics Row */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '100%',
            paddingTop: 6,
            borderTopWidth: 1,
            borderTopColor: sldColors.nodes.source.border,
          }}
        >
          {/* Q Value */}
          <View style={{ alignItems: 'center' }}>
            <Text
              style={{
                color: sldColors.nodes.source.metric,
                fontSize: 8,
              }}
            >
              Q
            </Text>
            <Text
              style={{
                color: sldColors.nodes.source.text,
                fontSize: 10,
                fontWeight: '500',
              }}
            >
              {data.q.toFixed(1)}
            </Text>
          </View>

          {/* PF Value */}
          <View style={{ alignItems: 'center' }}>
            <Text
              style={{
                color: sldColors.nodes.source.metric,
                fontSize: 8,
              }}
            >
              PF
            </Text>
            <Text
              style={{
                color: sldColors.nodes.source.text,
                fontSize: 10,
                fontWeight: '500',
              }}
            >
              {data.pf.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default SourceNode;
