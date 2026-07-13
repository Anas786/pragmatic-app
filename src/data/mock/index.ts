// Export all mock data from a single entry point.
// NOTE: `./sld` is deliberately NOT re-exported — its fixture is only
// consumed by __tests__/sldDeoverlap.test.ts (deep import), so keeping
// it out of the barrel keeps it out of the production bundle.
export * from './alarms';
export * from './inverterTable';
