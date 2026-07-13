import { QueryClient } from '@tanstack/react-query';

/**
 * App-wide React Query client singleton.
 *
 * Lives in its own leaf module (instead of App.tsx-local state) so non-React
 * code — specifically the forced-logout path in src/networking/config.ts —
 * can wipe the cache without a hook or a mounted component, and without
 * creating a require cycle. App.tsx feeds this same instance to
 * QueryClientProvider.
 */
export const queryClient = new QueryClient();
