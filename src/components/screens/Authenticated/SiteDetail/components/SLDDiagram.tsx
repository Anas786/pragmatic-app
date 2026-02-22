import React, { FC, useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import {
  ACCENT_GREEN,
  ACCENT_RED,
  BLUE_LINE,
  INPUT_DARK_BORDER,
  METRIC_CARD_BG,
  normalizeHeight,
  normalizeWidth,
  TEXT_SECONDARY,
  WHITE,
} from 'src/utils';
import ControlButtons from './ControlButtons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DIAGRAM_WIDTH = SCREEN_WIDTH - normalizeWidth(24);
const DIAGRAM_HEIGHT = normalizeHeight(500);

const SLDDiagram: FC = () => {
  const [scale, setScale] = useState(1);
  const [isLocked, setIsLocked] = useState(false);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleToggleLock = () => {
    setIsLocked(prev => !prev);
  };

  const handleFullscreen = () => {
    // Fullscreen functionality placeholder
  };

  return (
    <View style={styles.container}>
      <View style={styles.diagramContainer}>
        <Svg width={DIAGRAM_WIDTH} height={DIAGRAM_HEIGHT} viewBox="0 0 400 500">
          <G scale={scale} originX={200} originY={250}>
            {/* Top measurement boxes */}
            <G>
              <SvgText
                x="50"
                y="30"
                fill={TEXT_SECONDARY}
                fontSize="12"
                fontWeight="400">
                Q: 58.95
              </SvgText>
              <SvgText
                x="50"
                y="45"
                fill={TEXT_SECONDARY}
                fontSize="12"
                fontWeight="400">
                PF: 58.95
              </SvgText>

              <SvgText
                x="150"
                y="30"
                fill={TEXT_SECONDARY}
                fontSize="12"
                fontWeight="400">
                Q: 58.95
              </SvgText>
              <SvgText
                x="150"
                y="45"
                fill={TEXT_SECONDARY}
                fontSize="12"
                fontWeight="400">
                PF: 58.95
              </SvgText>

              <SvgText
                x="250"
                y="30"
                fill={TEXT_SECONDARY}
                fontSize="12"
                fontWeight="400">
                Q: 58.95
              </SvgText>
              <SvgText
                x="250"
                y="45"
                fill={TEXT_SECONDARY}
                fontSize="12"
                fontWeight="400">
                PF: 58.95
              </SvgText>
            </G>

            {/* Green dashed lines from top left */}
            <Path
              d="M 60 60 Q 60 120, 100 180"
              stroke={ACCENT_GREEN}
              strokeWidth="2"
              strokeDasharray="5,5"
              fill="none"
            />

            {/* Blue dashed lines from top middle */}
            <Path
              d="M 180 60 Q 180 120, 200 180"
              stroke={BLUE_LINE}
              strokeWidth="2"
              strokeDasharray="5,5"
              fill="none"
            />

            {/* Blue solid line from top right */}
            <Path
              d="M 280 60 Q 280 120, 250 180"
              stroke={BLUE_LINE}
              strokeWidth="2"
              fill="none"
            />

            {/* Central Lucky Cement box */}
            <Rect
              x="150"
              y="200"
              width="100"
              height="60"
              fill={METRIC_CARD_BG}
              stroke={ACCENT_RED}
              strokeWidth="2"
              rx="8"
            />
            <SvgText
              x="200"
              y="220"
              fill={WHITE}
              fontSize="12"
              textAnchor="middle"
              fontWeight="600">
              Lucky Cement
            </SvgText>
            <SvgText
              x="200"
              y="240"
              fill={TEXT_SECONDARY}
              fontSize="10"
              textAnchor="middle">
              Load: 315.44
            </SvgText>
            <Circle cx="200" cy="235" r="8" fill={ACCENT_RED} opacity={0.3} />

            {/* Bottom connections */}
            {/* Green dashed line bottom left */}
            <Path
              d="M 120 260 Q 100 320, 80 380"
              stroke={ACCENT_GREEN}
              strokeWidth="2"
              strokeDasharray="5,5"
              fill="none"
            />

            {/* Green solid lines bottom middle-left */}
            <Path
              d="M 180 260 Q 180 300, 180 340"
              stroke={ACCENT_GREEN}
              strokeWidth="2"
              fill="none"
            />

            {/* Blue dashed line bottom middle-right */}
            <Path
              d="M 220 260 Q 240 320, 260 380"
              stroke={BLUE_LINE}
              strokeWidth="2"
              strokeDasharray="5,5"
              fill="none"
            />

            {/* Green dashed line bottom right */}
            <Path
              d="M 280 260 Q 300 320, 320 380"
              stroke={ACCENT_GREEN}
              strokeWidth="2"
              strokeDasharray="5,5"
              fill="none"
            />

            {/* Bottom labels */}
            <G>
              <Circle cx="80" cy="400" r="15" fill={METRIC_CARD_BG} />
              <SvgText
                x="80"
                y="405"
                fill={ACCENT_GREEN}
                fontSize="16"
                textAnchor="middle">
                ☀️
              </SvgText>
              <SvgText
                x="80"
                y="430"
                fill={TEXT_SECONDARY}
                fontSize="10"
                textAnchor="middle">
                Solar
              </SvgText>

              <Circle cx="180" cy="360" r="15" fill={METRIC_CARD_BG} />
              <SvgText
                x="180"
                y="365"
                fill={TEXT_SECONDARY}
                fontSize="16"
                textAnchor="middle">
                💨
              </SvgText>
              <SvgText
                x="180"
                y="390"
                fill={TEXT_SECONDARY}
                fontSize="10"
                textAnchor="middle">
                Wind
              </SvgText>

              <Circle cx="260" cy="400" r="15" fill={METRIC_CARD_BG} />
              <SvgText
                x="260"
                y="405"
                fill={BLUE_LINE}
                fontSize="16"
                textAnchor="middle">
                ⚡
              </SvgText>
              <SvgText
                x="260"
                y="430"
                fill={TEXT_SECONDARY}
                fontSize="10"
                textAnchor="middle">
                PCS
              </SvgText>
            </G>

            {/* Decorative dots */}
            {[...Array(20)].map((_, i) => (
              <Circle
                key={i}
                cx={Math.random() * 400}
                cy={Math.random() * 500}
                r="1.5"
                fill={TEXT_SECONDARY}
                opacity={0.3}
              />
            ))}
          </G>
        </Svg>
      </View>

      <ControlButtons
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onToggleLock={handleToggleLock}
        onFullscreen={handleFullscreen}
        isLocked={isLocked}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  diagramContainer: {
    backgroundColor: METRIC_CARD_BG,
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    borderRadius: 16,
    padding: normalizeWidth(16),
    minHeight: DIAGRAM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SLDDiagram;
