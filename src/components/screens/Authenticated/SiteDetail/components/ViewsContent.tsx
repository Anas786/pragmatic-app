import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ErrorBoundary } from 'src/components/common';
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
  // `pendingTab` drives the chip strip and updates synchronously on
  // tap so the blob morph + press-scale render on the very next
  // frame. `renderedTab` drives the body and is deferred by one rAF
  // so the heavy subtree mount can't share a commit with the chip
  // update (otherwise the morph appears to lag).
  //
  // Intentionally NOT using a keep-mounted / display:none strategy
  // here. Hidden tabs keep their PulseDot worklets, GIF playback and
  // useQuery polling alive on the UI/JS threads — after walking
  // through 4–5 tabs the accumulated continuous work pinned the CPU
  // and the device heated up. Render only the active tab; first-
  // visit cost is mitigated by the `useInteractionReady` defer
  // inside each heavy view + the chip-morph rAF split below.
  const [pendingTab, setPendingTab] = useState<TabOption>('Summary');
  const [renderedTab, setRenderedTab] = useState<TabOption>('Summary');
  const rafRef = useRef<number | null>(null);

  const handleSelect = useCallback((tab: TabOption) => {
    setPendingTab(tab);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setRenderedTab(tab);
    });
  }, []);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const renderTabContent = () => {
    switch (renderedTab) {
      case 'Summary':
        return <SummaryView />;
      case 'Cards':
        return <CardsView />;
      case 'Live':
        // Wrapped so a render-time crash here (which has been seen on
        // sites with unusually large or oddly-shaped live payloads)
        // surfaces a debuggable message instead of taking the JS
        // thread down with it.
        return (
          <ErrorBoundary label="Live Parameters">
            <LiveParameterView />
          </ErrorBoundary>
        );
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
      <TabSelector selected={pendingTab} onSelect={handleSelect} />
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
