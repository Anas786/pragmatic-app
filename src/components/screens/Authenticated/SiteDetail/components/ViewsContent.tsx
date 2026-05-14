import React, { FC, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { normalizeHeight } from 'src/utils';
import TabSelector, { TabOption } from './TabSelector';
import SummaryView from './SummaryView';
import CardsView from './CardsView';
import LiveParameterView from './LiveParameterView';
import AlarmsView from './AlarmsView';
import TrendView from './TrendView';
import ReportsView from './ReportsView';
import TablesView from './TablesView';

const ViewsContent: FC = () => {
  const [selectedTab, setSelectedTab] = useState<TabOption>('Summary');

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'Summary':
        return <SummaryView />;
      case 'Cards':
        return <CardsView />;
      case 'Live':
        return <LiveParameterView />;
      case 'Alarms':
        return <AlarmsView />;
      case 'Trend':
        return <TrendView />;
      case 'Reports':
        return <ReportsView />;
      case 'Tables':
        return <TablesView />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <TabSelector selected={selectedTab} onSelect={setSelectedTab} />
      {renderTabContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: normalizeHeight(16),
  },
});

export default ViewsContent;
