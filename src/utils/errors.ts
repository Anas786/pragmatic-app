/**
 * User-facing error copy. Every empty/error/offline state takes its words
 * from `friendlyError()` so the app never shows a raw `error.message`,
 * an HTTP status code or a stack to a user: the title says what happened,
 * the message says what to do. The raw error is logged (dev builds only).
 */
import { display } from './logger';

export type FriendlyErrorKind = 'offline' | 'timeout' | 'auth' | 'server' | 'unknown';

export interface FriendlyError {
  kind: FriendlyErrorKind;
  title: string;
  message: string;
}

type ErrorLike = {
  code?: unknown;
  message?: unknown;
  name?: unknown;
  status?: unknown;
  isAxiosError?: unknown;
  request?: unknown;
  response?: { status?: unknown } | null;
};

const COPY: Record<FriendlyErrorKind, Omit<FriendlyError, 'kind'>> = {
  offline: {
    title: "You're offline",
    message: 'Check your internet connection, then try again.',
  },
  timeout: {
    title: 'This is taking too long',
    message: "The server didn't respond in time. Try again in a moment.",
  },
  auth: {
    title: 'Your session has ended',
    message: 'Sign in again to keep monitoring your sites.',
  },
  server: {
    title: "Our servers aren't responding",
    message: 'This is on our side. Try again in a few minutes.',
  },
  unknown: {
    title: 'Something went wrong',
    message: 'Try again. If it keeps happening, contact support.',
  },
};

const FORBIDDEN: Omit<FriendlyError, 'kind'> = {
  title: "You don't have access to this",
  message: 'Ask your administrator to give your account access.',
};

const NOT_FOUND: Omit<FriendlyError, 'kind'> = {
  title: "This data isn't available",
  message: 'It may not be set up for this site yet.',
};

const statusOf = (e: ErrorLike): number | null => {
  const s = e.response?.status ?? e.status;
  return typeof s === 'number' && Number.isFinite(s) ? s : null;
};

const classify = (err: unknown): { kind: FriendlyErrorKind; status: number | null } => {
  if (!err || typeof err !== 'object') return { kind: 'unknown', status: null };
  const e = err as ErrorLike;
  const code = typeof e.code === 'string' ? e.code : '';
  const message = typeof e.message === 'string' ? e.message : '';
  const status = statusOf(e);

  if (
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT' ||
    /timeout/i.test(message) ||
    status === 408 ||
    status === 504
  ) {
    return { kind: 'timeout', status };
  }
  if (status === 401 || status === 403) return { kind: 'auth', status };
  if (status !== null && status >= 500) return { kind: 'server', status };
  if (status !== null) return { kind: 'unknown', status };
  if (
    code === 'ERR_NETWORK' ||
    /network\s*(error|request failed)/i.test(message) ||
    // axios: the request went out but no response ever came back.
    (e.isAxiosError === true && e.request !== undefined && !e.response)
  ) {
    return { kind: 'offline', status };
  }
  return { kind: 'unknown', status };
};

/**
 * Map any thrown value (axios error, Amplify error, Error, string…) to
 * plain-language copy. Never includes the raw message, code or status.
 */
export const friendlyError = (err: unknown): FriendlyError => {
  const { kind, status } = classify(err);
  if (__DEV__) {
    display('friendlyError', err, `${kind}${status !== null ? ` (${status})` : ''}`);
  }
  if (kind === 'auth' && status === 403) return { kind, ...FORBIDDEN };
  if (kind === 'unknown' && status === 404) return { kind, ...NOT_FOUND };
  return { kind, ...COPY[kind] };
};
