import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from 'src/types';

/**
 * Module-level navigation ref, attached to the NavigationContainer in
 * App.tsx. Lets non-component code (the axios forced-logout path in
 * src/networking/config.ts) drive navigation for the app's whole lifetime —
 * unlike a hook-registered handler, it can't go stale when a screen unmounts.
 *
 * Kept OUT of the ./index barrel on purpose: networking code imports this
 * file directly, and importing the routes barrel from networking would drag
 * every screen into a require cycle (routes → screens → hooks → networking).
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Hard-reset the root navigator to Onboarding → Login.
 *
 * Used by the forced-logout path (terminal 401/403/419) so the user is never
 * stranded on authenticated screens with a dead session. No-ops when:
 *  - no navigator is mounted yet: during the cold-start SplashOverlay the
 *    container renders no navigator until the overlay has picked a route,
 *    so a cold-start 401 is a no-op here and the overlay's own auth result
 *    decides the route, or
 *  - the root is already on the Onboarding stack (a login-screen-time 401
 *    must not clobber the Login form).
 */
export const resetToLogin = (): void => {
  if (!navigationRef.isReady()) return;

  const rootState = navigationRef.getRootState();
  const activeRootRoute = rootState?.routes?.[rootState.index ?? 0]?.name;
  if (activeRootRoute === 'Onboarding') return;

  navigationRef.resetRoot({
    index: 0,
    routes: [
      {
        name: 'Onboarding',
        state: { routes: [{ name: 'Login' }] },
      },
    ],
  });
};
