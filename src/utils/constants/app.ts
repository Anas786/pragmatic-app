import { Dimensions } from 'react-native';
import { API_BASE_URL, ASSETS_CDN_URL } from '@env';

export const WIDTH = Dimensions.get('screen').width;
export const HEIGHT = Dimensions.get('screen').height;

/**
 * CloudFront-fronted API. Trailing slash is intentionally stripped so
 * relative paths like '/public/config/params-mapping' or
 * '/private/user/site-list' compose cleanly with axios's baseURL.
 */
const FALLBACK_BASE_URL = 'https://d28614wxzuokob.cloudfront.net';
const FALLBACK_ASSETS_CDN = 'https://d1syhs8qvp9sng.cloudfront.net';
const stripTrailingSlash = (url: string) => url.replace(/\/+$/, '');

export const BASE_URL = stripTrailingSlash(API_BASE_URL || FALLBACK_BASE_URL);
export const ASSETS_CDN = stripTrailingSlash(
  ASSETS_CDN_URL || FALLBACK_ASSETS_CDN,
);
