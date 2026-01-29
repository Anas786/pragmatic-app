import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SiteStackParamList } from '../../navigation/types';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import {
  LineChart,
  AreaChart,
  BarChart,
  PieChart,
  GaugeChart,
  generateTimeLabels,
  chartColors,
} from '../../components/charts';
import { SLDCanvas, SLDData } from '../../components/sld';

type RouteProps = RouteProp<SiteStackParamList, 'SiteDetail'>;
type NavigationProps = NativeStackNavigationProp<SiteStackParamList, 'SiteDetail'>;

const TABS = ['Summary', 'Cards', 'Alarms', 'Trends'] as const;
type TabType = typeof TABS[number];

// Mock data
const MOCK_SITE_DATA = {
  load: 315.44,
  efficiency: 86.56,
  metrics: {
    solar: { power: 145.2, q: 58.95, pf: 0.95 },
    wind: { power: 89.5, q: 42.3, pf: 0.92 },
    grid: { power: 80.74, q: 35.8, pf: 0.98 },
  },
  alarms: [
    { id: '1', title: 'High Voltage Warning', severity: 'warning', time: '07:45 PM' },
    { id: '2', title: 'Communication Lost', severity: 'critical', time: '07:30 PM' },
  ],
};

// Mock chart data
const MOCK_POWER_TREND_DATA = {
  solar: [120, 135, 145, 160, 155, 145, 130, 110, 90, 70, 50, 30],
  wind: [80, 85, 95, 100, 105, 95, 85, 90, 95, 100, 90, 85],
  grid: [100, 90, 70, 50, 55, 75, 100, 120, 130, 145, 175, 200],
};

const MOCK_EFFICIENCY_DATA = [78, 82, 85, 88, 86, 84, 82, 85, 87, 89, 86, 84];

const MOCK_ALARM_DATA = {
  critical: [2, 1, 3, 2, 0, 1, 2],
  warning: [5, 4, 6, 3, 4, 5, 3],
  info: [8, 10, 7, 9, 11, 8, 6],
};

// Mock SLD data
const createSLDData = (siteName: string, siteId: string): SLDData => ({
  site: {
    id: siteId,
    name: siteName,
    load: MOCK_SITE_DATA.load,
    icon: 'factory',
  },
  sources: [
    {
      id: 'solar-1',
      type: 'solar',
      power: MOCK_SITE_DATA.metrics.solar.power,
      q: MOCK_SITE_DATA.metrics.solar.q,
      pf: MOCK_SITE_DATA.metrics.solar.pf,
      status: 'active',
    },
    {
      id: 'wind-1',
      type: 'wind',
      power: MOCK_SITE_DATA.metrics.wind.power,
      q: MOCK_SITE_DATA.metrics.wind.q,
      pf: MOCK_SITE_DATA.metrics.wind.pf,
      status: 'active',
    },
    {
      id: 'grid-1',
      type: 'grid',
      power: MOCK_SITE_DATA.metrics.grid.power,
      q: MOCK_SITE_DATA.metrics.grid.q,
      pf: MOCK_SITE_DATA.metrics.grid.pf,
      status: 'active',
    },
  ],
  connections: [
    { id: 'conn-1', source: 'solar-1', target: siteId, type: 'renewable' },
    { id: 'conn-2', source: 'wind-1', target: siteId, type: 'renewable' },
    { id: 'conn-3', source: 'grid-1', target: siteId, type: 'grid' },
  ],
});

export const SiteDetailScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const { siteId, siteName } = route.params;
  const [activeTab, setActiveTab] = useState<TabType>('Summary');

  const navigateToView = (screen: keyof SiteStackParamList) => {
    navigation.navigate(screen, { siteId, siteName });
  };

  const renderTab = (tab: TabType) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        key={tab}
        onPress={() => setActiveTab(tab)}
        className={`flex-1 py-3 items-center border-b-2 ${
          isActive ? 'border-brand-primary' : 'border-transparent'
        }`}
      >
        <Text
          className={`text-sm font-medium ${
            isActive ? 'text-brand-primary' : 'text-text-secondary'
          }`}
        >
          {tab}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSummaryTab = () => (
    <View>
      {/* Site Load Overview */}
      <Card className="mb-4">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <Text className="text-2xl mr-2">🏭</Text>
            <View>
              <Text className="text-text-primary text-lg font-semibold">{siteName}</Text>
              <Text className="text-text-muted text-sm">Site ID: {siteId}</Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-text-primary text-xl font-bold">
              {MOCK_SITE_DATA.load}
            </Text>
            <Text className="text-text-muted text-sm">kW Load</Text>
          </View>
        </View>

        {/* Efficiency Bar */}
        <View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-text-secondary text-sm">Power Efficiency</Text>
            <Text className="text-brand-primary text-sm font-semibold">
              {MOCK_SITE_DATA.efficiency}%
            </Text>
          </View>
          <ProgressBar progress={MOCK_SITE_DATA.efficiency} showPercentage={false} />
        </View>
      </Card>

      {/* Power Sources Grid */}
      <Text className="text-text-primary text-lg font-semibold mb-3">Power Sources</Text>
      <View className="flex-row gap-3 mb-4">
        {/* Solar */}
        <Card className="flex-1">
          <Text className="text-2xl mb-2">☀️</Text>
          <Text className="text-text-primary text-lg font-bold">
            {MOCK_SITE_DATA.metrics.solar.power}
          </Text>
          <Text className="text-text-muted text-xs mb-2">kW</Text>
          <View className="flex-row justify-between">
            <Text className="text-text-muted text-xs">Q: {MOCK_SITE_DATA.metrics.solar.q}</Text>
            <Text className="text-text-muted text-xs">PF: {MOCK_SITE_DATA.metrics.solar.pf}</Text>
          </View>
        </Card>

        {/* Wind */}
        <Card className="flex-1">
          <Text className="text-2xl mb-2">💨</Text>
          <Text className="text-text-primary text-lg font-bold">
            {MOCK_SITE_DATA.metrics.wind.power}
          </Text>
          <Text className="text-text-muted text-xs mb-2">kW</Text>
          <View className="flex-row justify-between">
            <Text className="text-text-muted text-xs">Q: {MOCK_SITE_DATA.metrics.wind.q}</Text>
            <Text className="text-text-muted text-xs">PF: {MOCK_SITE_DATA.metrics.wind.pf}</Text>
          </View>
        </Card>

        {/* Grid */}
        <Card className="flex-1">
          <Text className="text-2xl mb-2">⚡</Text>
          <Text className="text-text-primary text-lg font-bold">
            {MOCK_SITE_DATA.metrics.grid.power}
          </Text>
          <Text className="text-text-muted text-xs mb-2">kW</Text>
          <View className="flex-row justify-between">
            <Text className="text-text-muted text-xs">Q: {MOCK_SITE_DATA.metrics.grid.q}</Text>
            <Text className="text-text-muted text-xs">PF: {MOCK_SITE_DATA.metrics.grid.pf}</Text>
          </View>
        </Card>
      </View>

      {/* Single Line Diagram */}
      <Card className="mb-4">
        <Text className="text-text-primary text-base font-semibold mb-3">
          Single Line Diagram
        </Text>
        <SLDCanvas
          data={createSLDData(siteName, siteId)}
          height={280}
          onNodePress={(nodeId, nodeType) => {
            console.log(`Pressed ${nodeType}: ${nodeId}`);
          }}
        />
      </Card>
    </View>
  );

  const renderCardsTab = () => (
    <View>
      <Text className="text-text-secondary text-center py-8">
        Cards view will display device metric cards
      </Text>
    </View>
  );

  const renderAlarmsTab = () => (
    <View>
      {MOCK_SITE_DATA.alarms.map(alarm => (
        <Card key={alarm.id} className="mb-3">
          <View className="flex-row items-center">
            <Text className="text-xl mr-3">
              {alarm.severity === 'critical' ? '❌' : '⚠️'}
            </Text>
            <View className="flex-1">
              <Text className="text-text-primary text-base font-medium">
                {alarm.title}
              </Text>
              <Text className="text-text-muted text-sm">{alarm.time}</Text>
            </View>
          </View>
        </Card>
      ))}
    </View>
  );

  // Generate time labels for charts
  const timeLabels = useMemo(() => generateTimeLabels(11, 1), []);
  const weekDays = useMemo(
    () => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    []
  );

  const renderTrendsTab = () => (
    <View>
      {/* Power Generation Trends (Stacked Area) */}
      <Card className="mb-4">
        <Text className="text-text-primary text-base font-semibold mb-3">
          Power Generation (Last 12 Hours)
        </Text>
        <AreaChart
          height={200}
          xAxisData={timeLabels}
          series={[
            { name: 'Solar', data: MOCK_POWER_TREND_DATA.solar, color: chartColors.tertiary },
            { name: 'Wind', data: MOCK_POWER_TREND_DATA.wind, color: chartColors.secondary },
            { name: 'Grid', data: MOCK_POWER_TREND_DATA.grid, color: chartColors.primary },
          ]}
          yAxisUnit="kW"
          stacked
        />
      </Card>

      {/* Efficiency Trend (Line) */}
      <Card className="mb-4">
        <Text className="text-text-primary text-base font-semibold mb-3">
          Efficiency Trend
        </Text>
        <LineChart
          height={180}
          xAxisData={timeLabels}
          series={[
            { name: 'Efficiency', data: MOCK_EFFICIENCY_DATA, color: chartColors.primary },
          ]}
          yAxisUnit="%"
          showArea
          showLegend={false}
        />
      </Card>

      {/* Power Distribution (Pie) */}
      <Card className="mb-4">
        <Text className="text-text-primary text-base font-semibold mb-3">
          Current Power Distribution
        </Text>
        <PieChart
          height={180}
          data={[
            { name: 'Solar', value: MOCK_SITE_DATA.metrics.solar.power, color: chartColors.tertiary },
            { name: 'Wind', value: MOCK_SITE_DATA.metrics.wind.power, color: chartColors.secondary },
            { name: 'Grid', value: MOCK_SITE_DATA.metrics.grid.power, color: chartColors.primary },
          ]}
          donut
          centerText={`${MOCK_SITE_DATA.load} kW`}
        />
      </Card>

      {/* Weekly Alarm Summary (Stacked Bar) */}
      <Card className="mb-4">
        <Text className="text-text-primary text-base font-semibold mb-3">
          Weekly Alarm Summary
        </Text>
        <BarChart
          height={180}
          xAxisData={weekDays}
          series={[
            { name: 'Critical', data: MOCK_ALARM_DATA.critical, color: '#FF4757' },
            { name: 'Warning', data: MOCK_ALARM_DATA.warning, color: '#FFB800' },
            { name: 'Info', data: MOCK_ALARM_DATA.info, color: '#3498DB' },
          ]}
          stacked
        />
      </Card>

      {/* Efficiency Gauge */}
      <Card className="mb-4">
        <Text className="text-text-primary text-base font-semibold mb-3">
          Current Efficiency
        </Text>
        <GaugeChart
          height={160}
          value={MOCK_SITE_DATA.efficiency}
          title="Power Efficiency"
        />
      </Card>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Summary':
        return renderSummaryTab();
      case 'Cards':
        return renderCardsTab();
      case 'Alarms':
        return renderAlarmsTab();
      case 'Trends':
        return renderTrendsTab();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['bottom']}>
      {/* Tab Bar */}
      <View className="flex-row bg-background-secondary border-b border-border">
        {TABS.map(renderTab)}
      </View>

      {/* Tab Content */}
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}

        {/* Quick Navigation Buttons */}
        <View className="mt-6">
          <Text className="text-text-primary text-base font-semibold mb-3">
            Quick Navigation
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-background-secondary rounded-lg py-3 items-center"
              onPress={() => navigateToView('LiveParameters')}
            >
              <Text className="text-lg mb-1">📊</Text>
              <Text className="text-text-primary text-sm">Live Parameters</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-background-secondary rounded-lg py-3 items-center"
              onPress={() => navigateToView('Devices')}
            >
              <Text className="text-lg mb-1">🔌</Text>
              <Text className="text-text-primary text-sm">Devices</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-background-secondary rounded-lg py-3 items-center"
              onPress={() => navigateToView('AlarmManagement')}
            >
              <Text className="text-lg mb-1">🔔</Text>
              <Text className="text-text-primary text-sm">Alarms</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SiteDetailScreen;
