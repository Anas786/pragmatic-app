import React, { FC, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppText } from 'src/components/common';
import {
  ACCENT_BLUE,
  ACCENT_GREEN,
  ACCENT_RED,
  CARD_BG,
  CHART_RULE_COLOR,
  FONT_SIZE_MICRO,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_MD,
  ICON_SIZE_XS,
  INPUT_DARK_BG,
  INPUT_DARK_BORDER,
  normalizeHeight,
  normalizeWidth,
  OVERLAY_DARK,
  OVERLAY_LIGHT_BORDER,
  OVERLAY_LIGHT_STRIP,
  TEXT_SECONDARY,
  TRANSPARENT,
  WHITE,
} from 'src/utils';
import { formatDate } from 'src/utils/format';
import { trendAnalysisSeries } from 'src/data/mock';
import DateRangePickerModal from './DateRangePickerModal';

const BASE_CHART_WIDTH = normalizeWidth(310);
const BASE_SPACING = BASE_CHART_WIDTH / 7;
const BASE_BAR_WIDTH = normalizeWidth(8);
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;
const CHART_HEIGHT = normalizeHeight(180);
const CHART_MAX_VALUE = 100;
const CHART_SECTIONS = 5;
const CHART_INITIAL_SPACING = normalizeWidth(20);
const CHART_END_SPACING = normalizeWidth(10);
const DATA_POINT_RADIUS = 4;
const LINE_THICKNESS = 2;
const AREA_START_OPACITY = 0.4;
const AREA_END_OPACITY = 0.05;
const POINTER_RADIUS = 5;
const POINTER_STRIP_WIDTH = 1;
const POINTER_LABEL_WIDTH = normalizeWidth(110);
const POINTER_LABEL_HEIGHT = normalizeHeight(80);
const TOOLTIP_DOT_SIZE = normalizeWidth(8);
const BAR_GROUP_SPACING = 2;
const BAR_SET_SPACING = normalizeWidth(18);

const Legend: FC = () => (
  <View style={styles.legendRow}>
    {trendAnalysisSeries.map(series => (
      <View
        key={series.year}
        style={[styles.legendBadge, { backgroundColor: series.color }]}>
        <AppText fontSize={FONT_SIZE_XXS} bold color={WHITE}>
          {series.year}
        </AppText>
      </View>
    ))}
  </View>
);

const ZoomControls: FC<{
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}> = ({ zoom, onZoomIn, onZoomOut }) => (
  <View style={styles.zoomControls}>
    <TouchableOpacity
      style={[styles.zoomButton, zoom <= MIN_ZOOM && styles.zoomButtonDisabled]}
      onPress={onZoomOut}
      disabled={zoom <= MIN_ZOOM}>
      <Icon
        name="minus"
        size={ICON_SIZE_XS}
        color={zoom <= MIN_ZOOM ? TEXT_SECONDARY : WHITE}
      />
    </TouchableOpacity>
    <AppText fontSize={FONT_SIZE_XXS} color={TEXT_SECONDARY}>
      {zoom.toFixed(1)}x
    </AppText>
    <TouchableOpacity
      style={[styles.zoomButton, zoom >= MAX_ZOOM && styles.zoomButtonDisabled]}
      onPress={onZoomIn}
      disabled={zoom >= MAX_ZOOM}>
      <Icon
        name="plus"
        size={ICON_SIZE_XS}
        color={zoom >= MAX_ZOOM ? TEXT_SECONDARY : WHITE}
      />
    </TouchableOpacity>
  </View>
);

const pointerLabelComponent = (items: any[]) => {
  return (
    <View style={styles.tooltip}>
      {items.map((item: any, index: number) => {
        const colors = [ACCENT_GREEN, ACCENT_RED, ACCENT_BLUE];
        const years = ['2021', '2022', '2023'];
        return (
          <View key={index} style={styles.tooltipRow}>
            <View
              style={[styles.tooltipDot, { backgroundColor: colors[index] }]}
            />
            <AppText fontSize={FONT_SIZE_XXS} color={WHITE}>
              {years[index]}: {item.value}
            </AppText>
          </View>
        );
      })}
    </View>
  );
};

const pointerConfig = {
  pointerStripColor: OVERLAY_LIGHT_STRIP,
  pointerStripWidth: POINTER_STRIP_WIDTH,
  pointerColor: WHITE,
  radius: POINTER_RADIUS,
  pointerLabelWidth: POINTER_LABEL_WIDTH,
  pointerLabelHeight: POINTER_LABEL_HEIGHT,
  activatePointersOnLongPress: false,
  autoAdjustPointerLabelPosition: true,
  pointerLabelComponent,
};

const TrendAnalysisCard: FC = () => {
  const [startDate, setStartDate] = useState(new Date(2025, 11, 16));
  const [endDate, setEndDate] = useState(new Date(2025, 11, 17));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const dateRange = `${formatDate(startDate, 'DD/MM/YY')} - ${formatDate(endDate, 'DD/MM/YY')}`;

  const handleDateApply = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  const [areaZoom, setAreaZoom] = useState(1);
  const [lineZoom, setLineZoom] = useState(1);
  const [barZoom, setBarZoom] = useState(1);

  const [greenData, redData, blueData] = trendAnalysisSeries.map(s => s.data);

  const getLineProps = (zoom: number) => ({
    width: BASE_CHART_WIDTH * zoom,
    height: CHART_HEIGHT,
    spacing: BASE_SPACING * zoom,
    initialSpacing: CHART_INITIAL_SPACING,
    endSpacing: CHART_END_SPACING,
    maxValue: CHART_MAX_VALUE,
    noOfSections: CHART_SECTIONS,
    yAxisTextStyle: { color: TEXT_SECONDARY, fontSize: FONT_SIZE_XXS },
    xAxisLabelTextStyle: { color: TEXT_SECONDARY, fontSize: FONT_SIZE_MICRO },
    xAxisColor: TEXT_SECONDARY,
    yAxisColor: TRANSPARENT,
    rulesColor: CHART_RULE_COLOR,
    rulesType: 'solid' as const,
    hideDataPoints: false,
    dataPointsRadius: DATA_POINT_RADIUS,
    curved: true,
    isAnimated: false,
    pointerConfig,
    scrollToEnd: false,
    disableScroll: false,
  });

  const barData = greenData.flatMap((item, i) => [
    {
      value: item.value,
      frontColor: ACCENT_GREEN,
      label: item.label,
      spacing: BAR_GROUP_SPACING,
      labelTextStyle: { color: TEXT_SECONDARY, fontSize: FONT_SIZE_MICRO },
    },
    {
      value: redData[i].value,
      frontColor: ACCENT_RED,
      spacing: BAR_GROUP_SPACING,
    },
    {
      value: blueData[i].value,
      frontColor: ACCENT_BLUE,
      spacing: BAR_SET_SPACING * barZoom,
    },
  ]);

  const renderBarTooltip = (item: any) => (
    <View style={styles.barTooltip}>
      <AppText fontSize={FONT_SIZE_XXS} bold color={WHITE}>
        {item.value}
      </AppText>
    </View>
  );

  const zoomIn = (
    setter: React.Dispatch<React.SetStateAction<number>>,
  ) => () => setter(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));

  const zoomOut = (
    setter: React.Dispatch<React.SetStateAction<number>>,
  ) => () => setter(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText fontSize={FONT_SIZE_SM} medium color={WHITE}>
          Trend Analysis
        </AppText>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.dateRangeContainer}
            onPress={() => setShowDatePicker(true)}>
            <Icon name="calendar-outline" size={ICON_SIZE_XS} color={WHITE} />
            <AppText fontSize={FONT_SIZE_XS} color={WHITE}>
              {dateRange}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.refreshButton}>
            <Icon name="sync" size={ICON_SIZE_MD} color={ACCENT_GREEN} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        {/* Area Chart */}
        <View style={styles.chartSection}>
          <ZoomControls
            zoom={areaZoom}
            onZoomIn={zoomIn(setAreaZoom)}
            onZoomOut={zoomOut(setAreaZoom)}
          />
          <LineChart
            {...getLineProps(areaZoom)}
            areaChart
            data={greenData}
            data2={redData}
            data3={blueData}
            color1={ACCENT_GREEN}
            color2={ACCENT_RED}
            color3={ACCENT_BLUE}
            dataPointsColor1={WHITE}
            dataPointsColor2={WHITE}
            dataPointsColor3={WHITE}
            startFillColor1={ACCENT_GREEN}
            endFillColor1={TRANSPARENT}
            startOpacity={AREA_START_OPACITY}
            endOpacity={AREA_END_OPACITY}
            startFillColor2={ACCENT_RED}
            endFillColor2={TRANSPARENT}
            startOpacity2={AREA_START_OPACITY}
            endOpacity2={AREA_END_OPACITY}
            startFillColor3={ACCENT_BLUE}
            endFillColor3={TRANSPARENT}
            startOpacity3={AREA_START_OPACITY}
            endOpacity3={AREA_END_OPACITY}
            thickness={LINE_THICKNESS}
          />
          <Legend />
        </View>

        {/* Line Chart */}
        <View style={styles.chartSection}>
          <ZoomControls
            zoom={lineZoom}
            onZoomIn={zoomIn(setLineZoom)}
            onZoomOut={zoomOut(setLineZoom)}
          />
          <LineChart
            {...getLineProps(lineZoom)}
            data={greenData}
            data2={redData}
            data3={blueData}
            color1={ACCENT_GREEN}
            color2={ACCENT_RED}
            color3={ACCENT_BLUE}
            dataPointsColor1={WHITE}
            dataPointsColor2={WHITE}
            dataPointsColor3={WHITE}
            thickness={LINE_THICKNESS}
          />
          <Legend />
        </View>

        {/* Bar Chart */}
        <View style={styles.chartSection}>
          <ZoomControls
            zoom={barZoom}
            onZoomIn={zoomIn(setBarZoom)}
            onZoomOut={zoomOut(setBarZoom)}
          />
          <BarChart
            data={barData}
            width={BASE_CHART_WIDTH * barZoom}
            height={CHART_HEIGHT}
            barWidth={BASE_BAR_WIDTH * barZoom}
            noOfSections={CHART_SECTIONS}
            maxValue={CHART_MAX_VALUE}
            yAxisTextStyle={{ color: TEXT_SECONDARY, fontSize: FONT_SIZE_XXS }}
            xAxisColor={TEXT_SECONDARY}
            yAxisColor={TRANSPARENT}
            rulesColor={CHART_RULE_COLOR}
            isAnimated={false}
            renderTooltip={renderBarTooltip}
            disableScroll={false}
          />
          <Legend />
        </View>
      </View>

      <DateRangePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        startDate={startDate}
        endDate={endDate}
        onApply={handleDateApply}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    borderRadius: normalizeWidth(16),
    overflow: 'hidden',
  },
  header: {
    backgroundColor: CARD_BG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: normalizeWidth(16),
    paddingVertical: normalizeHeight(16),
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalizeWidth(10),
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_DARK_BORDER,
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    borderRadius: 100,
    paddingHorizontal: normalizeWidth(14),
    paddingVertical: normalizeHeight(8),
    gap: normalizeWidth(8),
  },
  refreshButton: {
    width: normalizeWidth(38),
    height: normalizeWidth(38),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: ACCENT_GREEN,
    borderRadius: 100,
  },
  body: {
    backgroundColor: INPUT_DARK_BG,
    padding: normalizeWidth(12),
    gap: normalizeHeight(24),
  },
  chartSection: {
    alignItems: 'center',
    gap: normalizeHeight(12),
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: normalizeWidth(8),
  },
  zoomButton: {
    width: normalizeWidth(28),
    height: normalizeWidth(28),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: INPUT_DARK_BORDER,
    borderRadius: normalizeWidth(6),
  },
  zoomButtonDisabled: {
    opacity: 0.4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalizeWidth(8),
  },
  legendBadge: {
    paddingHorizontal: normalizeWidth(14),
    paddingVertical: normalizeHeight(4),
    borderRadius: 100,
  },
  tooltip: {
    backgroundColor: OVERLAY_DARK,
    borderRadius: normalizeWidth(8),
    paddingHorizontal: normalizeWidth(10),
    paddingVertical: normalizeHeight(8),
    gap: normalizeHeight(4),
    borderWidth: 1,
    borderColor: OVERLAY_LIGHT_BORDER,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalizeWidth(6),
  },
  tooltipDot: {
    width: TOOLTIP_DOT_SIZE,
    height: TOOLTIP_DOT_SIZE,
    borderRadius: TOOLTIP_DOT_SIZE / 2,
  },
  barTooltip: {
    backgroundColor: OVERLAY_DARK,
    borderRadius: normalizeWidth(6),
    paddingHorizontal: normalizeWidth(8),
    paddingVertical: normalizeHeight(4),
    marginBottom: normalizeHeight(4),
    borderWidth: 1,
    borderColor: OVERLAY_LIGHT_BORDER,
  },
});

export default TrendAnalysisCard;
