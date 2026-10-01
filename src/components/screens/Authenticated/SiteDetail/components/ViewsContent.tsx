import React, { FC, memo } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import { ErrorBoundary } from 'src/components/common';
import { DashboardStackParamList } from 'src/types';
import { TAB_LABELS, TabOption } from './TabSelector';
import SummaryView from './SummaryView';
import CardsView from './CardsView';
import LiveParameterView from './LiveParameterView';
import AlarmsView from './AlarmsView';
import TrendView from './TrendView';
import ReportsView from './ReportsView';
import TablesView from './TablesView';

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;

interface ViewsContentProps {
  /** The tab whose body is mounted (SiteDetail's `renderedTab`). */
  tab: TabOption;
}

const renderTab = (tab: TabOption) => {
  switch (tab) {
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

/**
 * Body of the active SiteDetail tab — and only the active one. The tab
 * strip and the pending/rendered split live in SiteDetail (the strip is
 * pinned outside the body ScrollView).
 *
 * Intentionally NOT a keep-mounted / display:none strategy. Hidden tabs
 * keep their PulseDot worklets, GIF playback and useQuery polling alive
 * on the UI/JS threads — after walking through 4–5 tabs the accumulated
 * continuous work pinned the CPU and the device heated up. First-visit
 * cost is mitigated by the `useInteractionReady` defer inside each heavy
 * view + SiteDetail's chip-morph rAF split.
 *
 * Every tab sits behind its own ErrorBoundary: a render crash in one tab
 * (an oddly-shaped payload) shows the 'This section couldn't be
 * displayed' card in that tab only. `resetKey` = site + tab, so switching
 * tab (or site) gives the next body a fresh attempt.
 *
 * Memoised on `tab`: SiteDetail state (scroll hairline, refresh spinner,
 * query flags) never re-renders the heavy tab body — each view subscribes
 * to the data it needs itself.
 */
const ViewsContent: FC<ViewsContentProps> = ({ tab }) => {
  const route = useRoute<SiteDetailRouteProp>();
  const siteId = route.params?.siteId ?? '';
  return (
    <ErrorBoundary label={TAB_LABELS[tab]} resetKey={`${siteId}:${tab}`}>
      {renderTab(tab)}
    </ErrorBoundary>
  );
};
ViewsContent.displayName = 'ViewsContent';

export default memo(ViewsContent);
