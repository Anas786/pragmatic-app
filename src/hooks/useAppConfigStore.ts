import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getParamsMapping } from 'src/networking';
import { ParamsMapping } from 'src/types';
import { display, log } from 'src/utils';

/**
 * Backend `Cache-Control` for params-mapping is `max-age=10800` (3 hours).
 * We mirror that on-device — within the TTL we serve cached data without
 * a network call; past it we refetch on next app open.
 */
const PARAMS_MAPPING_TTL_MS = 3 * 60 * 60 * 1000; // 3h

interface AppConfigState {
  paramsMapping: ParamsMapping | null;
  /** Unix epoch ms of the last successful fetch. */
  paramsMappingFetchedAt: number | null;
  /** True while a fetch is in flight. */
  loadingParamsMapping: boolean;
  /** Error message from the most recent failed fetch (cleared on success). */
  paramsMappingError: string | null;

  /**
   * Fetch params-mapping from the backend and persist it. Pass
   * `force: true` to bypass the freshness check (e.g. pull-to-refresh).
   * Returns the resulting mapping (or null on failure when no cache exists).
   */
  loadParamsMapping: (
    options?: { force?: boolean },
  ) => Promise<ParamsMapping | null>;

  /** Wipe the cached mapping. Useful for QA / forced re-bootstrap. */
  resetConfig: () => void;
}

export const useAppConfigStore = create<AppConfigState>()(
  persist(
    (set, get) => ({
      paramsMapping: null,
      paramsMappingFetchedAt: null,
      loadingParamsMapping: false,
      paramsMappingError: null,

      loadParamsMapping: async ({ force = false } = {}) => {
        const {
          paramsMapping,
          paramsMappingFetchedAt,
          loadingParamsMapping,
        } = get();

        // Dedupe in-flight requests: if a load is already running, just
        // wait for the next state tick by returning whatever's cached.
        if (loadingParamsMapping) return paramsMapping;

        // Serve cached value when fresh.
        if (
          !force &&
          paramsMapping &&
          paramsMappingFetchedAt &&
          Date.now() - paramsMappingFetchedAt < PARAMS_MAPPING_TTL_MS
        ) {
          log('[appConfig] params-mapping served from cache');
          return paramsMapping;
        }

        set({ loadingParamsMapping: true, paramsMappingError: null });
        try {
          const data = await getParamsMapping();
          set({
            paramsMapping: data,
            paramsMappingFetchedAt: Date.now(),
            loadingParamsMapping: false,
            paramsMappingError: null,
          });
          log('[appConfig] params-mapping fetched', {
            keys: Object.keys(data ?? {}).length,
          });
          return data;
        } catch (err: any) {
          const message = err?.message ?? String(err);
          display('appConfig.loadParamsMapping FAILED', { message });
          set({
            loadingParamsMapping: false,
            paramsMappingError: message,
          });
          // Fall back to whatever we already had cached so the app keeps
          // working offline.
          return get().paramsMapping;
        }
      },

      resetConfig: () =>
        set({
          paramsMapping: null,
          paramsMappingFetchedAt: null,
          paramsMappingError: null,
        }),
    }),
    {
      name: 'app-config-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the data + timestamp; transient flags are derived.
      partialize: state => ({
        paramsMapping: state.paramsMapping,
        paramsMappingFetchedAt: state.paramsMappingFetchedAt,
      }),
      version: 1,
    },
  ),
);

/**
 * Selector hook for screens that just want the mapping value.
 *
 * Returns the latest `paramsMapping` (or null if it hasn't been fetched
 * even once and the cache is empty). Components that mount before
 * bootstrap completes will re-render automatically once the fetch lands.
 */
export const useParamsMapping = () =>
  useAppConfigStore(s => s.paramsMapping);
