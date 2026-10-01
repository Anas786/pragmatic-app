/**
 * Screen-reader label builders. Non-interactive data tiles are ONE
 * accessible element whose label is composed here, so VoiceOver/TalkBack
 * read 'PV total power, 609 kilowatts, solar' instead of three fragments
 * with abbreviations.
 */
import type { FormattedQuantity } from './units';

/**
 * '<name>, <spoken value>[, <extra>…]'. Missing values read 'no data'.
 * Empty / whitespace-only parts are dropped.
 */
export const metricA11yLabel = (
  name: string,
  q: FormattedQuantity,
  extras: string[] = [],
): string =>
  [name, q.isMissing ? 'no data' : q.spoken, ...extras]
    .map(part => (part ?? '').trim())
    .filter(part => part.length > 0)
    .join(', ');
