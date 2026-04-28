import { useEffect } from 'react';
import { useAppConfigStore } from './useAppConfigStore';

/**
 * App-level bootstrap hook. Mount once near the top of the tree
 * (e.g. inside <App>) so it runs on every cold start and on every
 * resume from a fully terminated state.
 *
 * Currently fetches:
 *   1. /public/config/params-mapping  →  useAppConfigStore.paramsMapping
 *
 * Each loader is idempotent and TTL-gated, so calling them multiple
 * times in a session is safe and cheap.
 */
export const useBootstrap = () => {
  const loadParamsMapping = useAppConfigStore(s => s.loadParamsMapping);

  useEffect(() => {
    loadParamsMapping().catch(() => {
      // Errors are already logged inside the store; the cached value (if
      // any) keeps the app working offline.
    });
  }, [loadParamsMapping]);
};
