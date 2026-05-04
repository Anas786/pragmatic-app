import { ISite, ISiteListResponse } from 'src/types';
import { display, inspectError } from 'src/utils';
import { appAxios } from '../config';

export const DEFAULT_SITE_LIST_PAGE_SIZE = 50;

/**
 * Coerce whatever `/private/user/site-list` returns into the paginated
 * envelope. The endpoint can serve either:
 *
 *  1. The new paginated shape:
 *       { metadata: { total, page, pageSize, ... }, data: ISite[] }
 *  2. The legacy bare-array shape (treated as a single page).
 */
const normalizeSiteListResponse = (
  raw: unknown,
  fallbackPage: number,
  fallbackPageSize: number,
): ISiteListResponse => {
  if (Array.isArray(raw)) {
    return {
      metadata: {
        total: raw.length,
        page: fallbackPage,
        pageSize: fallbackPageSize,
        responseType: 'original',
      },
      data: raw as ISite[],
    };
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const data = Array.isArray(obj.data) ? (obj.data as ISite[]) : [];
    const meta = (obj.metadata ?? {}) as Record<string, unknown>;
    return {
      metadata: {
        source: typeof meta.source === 'string' ? meta.source : undefined,
        responseType:
          typeof meta.responseType === 'string'
            ? meta.responseType
            : undefined,
        total:
          typeof meta.total === 'number' ? meta.total : data.length,
        page:
          typeof meta.page === 'number' ? meta.page : fallbackPage,
        pageSize:
          typeof meta.pageSize === 'number'
            ? meta.pageSize
            : fallbackPageSize,
      },
      data,
    };
  }
  return {
    metadata: {
      total: 0,
      page: fallbackPage,
      pageSize: fallbackPageSize,
      responseType: 'original',
    },
    data: [],
  };
};

/**
 * Backend search-string constraint per the spec: length between 1 and
 * 128. Anything longer is silently truncated to the max so a runaway
 * paste from the user can't 400 the request.
 */
const SEARCH_MAX_LEN = 128;

const sanitizeSearch = (q: string | undefined): string | undefined => {
  if (!q) return undefined;
  const trimmed = q.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, SEARCH_MAX_LEN);
};

/**
 * GET /private/user/site-list?page={n}&pageSize={n}&q={search}
 *
 * Auth: Bearer idToken — attached automatically by the axios request
 * interceptor. 401 triggers a silent refresh-and-retry.
 *
 * The optional `q` param does a case-insensitive substring match
 * server-side against `name`. Length is enforced 1–128 by the backend;
 * we trim + cap defensively before sending.
 *
 * Spec: openapi.yaml#/paths/private/user/site-list/get
 */
export const getSiteList = async (
  page = 1,
  pageSize = DEFAULT_SITE_LIST_PAGE_SIZE,
  q?: string,
): Promise<ISiteListResponse> => {
  try {
    const params: Record<string, string | number> = { page, pageSize };
    const search = sanitizeSearch(q);
    if (search) params.q = search;

    const { data } = await appAxios.get<unknown>('/private/user/site-list', {
      params,
    });
    return normalizeSiteListResponse(data, page, pageSize);
  } catch (err) {
    display('user.getSiteList FAILED', inspectError(err));
    throw err;
  }
};

/**
 * GET /private/user/site-list/{id}
 *
 * Admin variant — returns the site list scoped to a specific user. Same
 * paginated envelope as the user-scoped variant.
 */
export const getSiteListByUserId = async (
  userId: string,
  page = 1,
  pageSize = DEFAULT_SITE_LIST_PAGE_SIZE,
): Promise<ISiteListResponse> => {
  try {
    const { data } = await appAxios.get<unknown>(
      `/private/user/site-list/${encodeURIComponent(userId)}`,
      { params: { page, pageSize } },
    );
    return normalizeSiteListResponse(data, page, pageSize);
  } catch (err) {
    display('user.getSiteListByUserId FAILED', inspectError(err));
    throw err;
  }
};
