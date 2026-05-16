/**
 * Tiny logger that writes to both `console` and Reactotron when available.
 * Use everywhere instead of bare `console.log` so messages always reach
 * Reactotron in dev builds.
 */

type LogArgs = unknown[];

const tron = () => (globalThis as any)?.tron;

export const log = (...args: LogArgs) => {
  // eslint-disable-next-line no-console
  console.log(...args);
  tron()?.log?.(...args);
};

export const warn = (...args: LogArgs) => {
  // eslint-disable-next-line no-console
  console.warn(...args);
  tron()?.warn?.(...args);
};

export const error = (...args: LogArgs) => {
  // eslint-disable-next-line no-console
  console.error(...args);
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
  // eslint-disable-next-line no-console
  console.log(`[${name}]`, preview ?? '', value);
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
