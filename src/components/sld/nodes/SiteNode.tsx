/**
 * SiteNode component - Central node showing site name and load
 * Displays the main site/factory with total power load
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { sldColors, SiteNodeProps } from '../types';

export const SiteNode: React.FC<SiteNodeProps> = ({ data, position, onPress }) => {
  const getIcon = () => {
    switch (data.icon) {
      case 'factory':
        return '🏭';
      case 'building':
        return '🏢';
      case 'plant':
        return '🌿';
      default:
        return '🏭';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        transform: [{ translateX: -60 }, { translateY: -40 }],
      }}
    >
      <View
        style={{
          width: 120,
          backgroundColor: sldColors.nodes.site.background,
          borderWidth: 2,
          borderColor: sldColors.nodes.site.border,
          borderRadius: 12,
          padding: 12,
          alignItems: 'center',
          shadowColor: sldColors.nodes.site.border,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 5,
        }}
      >
        {/* Icon */}
        <Text style={{ fontSize: 28, marginBottom: 4 }}>{getIcon()}</Text>

        {/* Site Name */}
        <Text
          style={{
            color: sldColors.nodes.site.text,
            fontSize: 11,
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: 4,
          }}
          numberOfLines={2}
        >
          {data.name}
        </Text>

        {/* Load Value */}
        <View
          style={{
            backgroundColor: sldColors.nodes.site.border,
            borderRadius: 4,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 'bold',
            }}
          >
            {data.load.toFixed(2)} kW
          </Text>
        </View>

        {/* Load Label */}
        <Text
          style={{
            color: sldColors.nodes.source.metric,
            fontSize: 9,
            marginTop: 2,
          }}
        >
          Load
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default SiteNode;
