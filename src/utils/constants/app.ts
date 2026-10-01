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

/**
 * App version shown in About / drawer footers. MUST match the native
 * project: iOS MARKETING_VERSION / CURRENT_PROJECT_VERSION
 * (project.pbxproj) and Android versionName / versionCode
 * (android/app/build.gradle). Never hard-code a version string in a screen.
 */
export const APP_VERSION = '1.0.2';
export const APP_BUILD = '1';
export const APP_VERSION_LABEL = `Version ${APP_VERSION} (${APP_BUILD})`;
