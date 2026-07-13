/**
 * Tiny logger that writes to both `console` and Reactotron when available.
 * Use everywhere instead of bare `console.log` so messages always reach
 * Reactotron in dev builds.
 *
 * ALL console output is dev-only: in release builds `console.*` still pays
 * Hermes serialization cost and lands in persistent device logs (logcat /
 * os_log) — auth breadcrumbs there are harvestable via adb / bug reports.
 * The Reactotron piping needs no gate: the `tron` global only exists in dev.
 */

type LogArgs = unknown[];

const tron = () => (globalThis as any)?.tron;

export const log = (...args: LogArgs) => {
  if (__DEV__) {
    console.log(...args);
  }
  tron()?.log?.(...args);
};

export const warn = (...args: LogArgs) => {
  if (__DEV__) {
    console.warn(...args);
  }
  tron()?.warn?.(...args);
};

export const error = (...args: LogArgs) => {
  if (__DEV__) {
    console.error(...args);
  }
  tron()?.error?.(args[0], args[1]);
};

/**
 * Send a structured display panel to Reactotron — much easier to read than
 * raw console output. Falls back to console.log when Reactotron isn't there.
 */
export const display = (
  name: string,
  value: unknown,
  preview?: string,
  important = false,
) => {
  // Dev-only: serializing full payloads to console in release builds costs
  // real CPU time on Hermes (Reactotron is already dev-only via the tron ref).
  if (__DEV__) {
    console.log(`[${name}]`, preview ?? '', value);
  }
  tron()?.display?.({
    name,
    preview: preview ?? (typeof value === 'string' ? value : undefined),
    value,
    important,
  });
};

/**
 * Expand any error — including AWS / Amplify wrapped errors — into a plain
 * object that prints something useful. Cognito wraps the real cause inside
 * `underlyingError` and `cause`.
 */
export const inspectError = (err: unknown): Record<string, unknown> => {
  if (!err) return { error: 'null/undefined' };
  if (err instanceof Error) {
    const e = err as any;
    return {
      name: e.name,
      message: e.message,
      stack: e.stack,
      cause: e.cause,
      underlyingError: e.underlyingError,
      $metadata: e.$metadata,
      code: e.code,
      // Some Amplify errors stash recovery suggestions on the instance
      recoverySuggestion: e.recoverySuggestion,
    };
  }
  return { error: err };
};

export const logger = { log, warn, error, display, inspectError };
