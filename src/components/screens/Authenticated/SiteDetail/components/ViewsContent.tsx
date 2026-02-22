import React, { FC, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { normalizeHeight } from 'src/utils';
import TabSelector, { TabOption } from './TabSelector';
import SummaryView from './SummaryView';
import CardsView from './CardsView';
import AlarmsView from './AlarmsView';
import EmptyState from './EmptyState';

const ViewsContent: FC = () => {
  const [selectedTab, setSelectedTab] = useState<TabOption>('Summary');

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'Summary':
        return <SummaryView />;
      case 'Cards':
        return <CardsView />;
      case 'Alarms':
        return <AlarmsView />;
      case 'Trend':
        return <EmptyState title="Trend" description="Trend analysis will be displayed here" />;
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
