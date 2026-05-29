import Share from 'react-native-share';
import { display } from 'src/utils';

/**
 * Minimal shape of the react-native-echarts-pro ref handle we use.
 * `getInstance` proxies a call to the echarts instance inside the
 * WebView and resolves with its return value.
 */
export interface ChartExportRef {
  getInstance: (functionName: string, params?: object) => Promise<unknown>;
}

const sanitize = (name: string): string =>
  (name || 'chart').replace(/[^\w-]+/g, '_').replace(/_+/g, '_').toLowerCase();

/**
 * Export an echarts chart's CURRENT rendered state (period filter, any
 * legend-toggled series, current zoom) to a PNG and open the OS share
 * sheet so the user can save/send it.
 *
 * echarts renders the image via `getDataURL`; react-native-share writes
 * a real temp `<filename>.png` (the `urls` plural branch) — NOT the
 * singular `url`, which would produce a file named "data".
 */
export const exportChartImage = async (
  ref: ChartExportRef | null | undefined,
  title: string,
  backgroundColor: string,
): Promise<void> => {
  if (!ref?.getInstance) return;
  try {
    // Race against a timeout — getInstance polls the WebView forever if
    // the bridge never answers; don't leave the button hanging.
    const dataURL = await Promise.race([
      ref.getInstance('getDataURL', {
        type: 'png',
        pixelRatio: 2,
        backgroundColor,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('getDataURL timed out')), 6000),
      ),
    ]);

    if (typeof dataURL !== 'string' || !dataURL.startsWith('data:image')) {
      display('exportChartImage: no image data returned', dataURL);
      return;
    }

    await Share.open({
      title: 'Export chart',
      urls: [dataURL],
      filename: `${sanitize(title)}.png`,
      type: 'image/png',
      failOnCancel: false,
    });
  } catch (err) {
    // User-cancelled shares also reject; swallow quietly.
    display('exportChartImage FAILED', String(err));
  }
};
