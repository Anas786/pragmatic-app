import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { APIResponse } from 'src/types';
import { BASE_URL } from 'src/utils';
import { display, inspectError } from 'src/utils/logger';
import { useUserStore } from 'src/hooks/useUserStore';
import { cognitoSignOut } from './auth/cognito';
import { getValidIdToken } from './auth/session';

export const appAxios = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/* ------------------------------------------------------------------ */
/* Legacy header helpers (kept for callers that might still use them) */
/* ------------------------------------------------------------------ */

export const setAuthToken = (token: string) => {
  appAxios.defaults.headers.Authorization = `Bearer ${token}`;
};

export const deleteToken = () => {
  delete appAxios.defaults.headers.Authorization;
};

/* -------------------- Global logout plumbing --------------------- */

let globalLogout: (() => void) | null = null;

export const setGlobalLogout = (logoutFn: () => void) => {
  globalLogout = logoutFn;
};

export const executeLogout = async () => {
  try {
    await cognitoSignOut();
  } catch (err) {
    display('executeLogout cognitoSignOut FAILED', inspectError(err));
  } finally {
    deleteToken();
    useUserStore.getState().removeUser();
    globalLogout?.();
  }
};

/* -------------------- Request interceptor ----------------------- */

const isPublicPath = (url?: string): boolean => {
  if (!url) return false;
  // Anything under /public/* is unauthenticated by API Gateway, so don't
  // even try to attach a Bearer token (avoids needless refresh attempts
  // on the login screen before the user has signed in).
  return /(?:^|\/)public\//i.test(url);
};

// Marker so we only retry a 401 once.
type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

appAxios.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (isPublicPath(config.url)) return config;
    try {
      const idToken = await getValidIdToken();
      if (idToken) {
        config.headers.Authorization = `Bearer ${idToken}`;
      }
    } catch (err) {
      display('axios.request token FAILED', inspectError(err));
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/* -------------------- Response interceptor ---------------------- */

/**
 * Auth-error handling:
 *
 *  1. On 401, attempt a single retry with `forceRefresh=true`. This handles
 *     the common case where API Gateway rejects a token because it expired
 *     in flight or because of clock drift — the retry uses the refresh
 *     token to mint a brand-new idToken and tries the original request once.
 *  2. If the retry also fails (or we already retried once), trigger logout.
 *  3. 403 / 419 are treated as terminal — no retry, log out immediately.
 */
appAxios.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as RetriableConfig | undefined;

    if (status === 401 && original && !original._retried) {
      original._retried = true;
      try {
        const idToken = await getValidIdToken(true);
        if (idToken) {
          original.headers = original.headers ?? {};
          (original.headers as any).Authorization = `Bearer ${idToken}`;
          return appAxios.request(original);
        }
      } catch (err) {
        display('axios.response retry FAILED', inspectError(err));
      }
    }

    if (status === 401 || status === 403 || status === 419) {
      executeLogout();
    }
    return Promise.reject(error);
  },
);

/* -------------------- Response unwrapper ------------------------ */

export const callAPI = async <T>(
  axiosPromise: Promise<AxiosResponse<APIResponse<T>>>,
): Promise<APIResponse<T>> => {
  try {
    const data = (await axiosPromise).data as APIResponse<T>;
    if (data.status === 'error') {
      throw new Error(data.message || 'An error occurred');
    }
    return data;
  } catch (err) {
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      if (status === 401 || status === 403 || status === 419) {
        // Already handled by the response interceptor — re-throw a friendly
        // message for the caller / UI.
        throw new Error('Unauthorized access. Please login again.');
      }
      throw (
        (err.response?.data as any)?.message ||
        err.message ||
        'Request failed'
      );
    }
    if (err instanceof Error) throw err.message;
    throw err;
  }
};
