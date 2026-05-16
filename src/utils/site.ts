import { ISite } from 'src/types';
import { ASSETS_CDN } from './constants';

/**
 * Build a public CDN URL for a site's logo.
 *
 * Backend stores the relative bucket path in `logo_ext` using the format
 * `<clientId>/<assetId>/<extension>` — e.g. `"1/72/.png"`. We split that
 * into a path prefix and an extension, then compose:
 *
 *   {ASSETS_CDN}/public/{logo_ext_without_ext}/{site_id}/logo{ext}
 *
 * Example
 * -------
 *   site = {
 *     id: "f6a9bf15-ce65-4db1-bf3a-cb954769ba7e",
 *     logo_ext: "1/72/.png",
 *     ...
 *   }
 *   →
 *   https://d1syhs8qvp9sng.cloudfront.net/public/1/72/f6a9bf15-ce65-4db1-bf3a-cb954769ba7e/logo.png
 *
 * Returns `null` when `logo_ext` is missing or malformed so callers can
 * render a placeholder.
 */
export const buildSiteLogoUrl = (
  site: Pick<ISite, 'id' | 'logo_ext'>,
): string | null => {
  if (!site?.logo_ext || !site.id) return null;

  // Match the trailing extension (e.g. ".png" / ".jpg" / ".jpeg" / ".svg" /
  // ".webp"). Backend convention is to embed the dot in the path itself.
  const match = site.logo_ext.match(/^(.*?)(\.[a-zA-Z0-9]+)$/);
  if (!match) return null;

  const [, prefix, extension] = match;
  // Strip any trailing slash on the prefix so we don't end up with `//`.
  const cleanPrefix = prefix.replace(/\/+$/, '');

  return `${ASSETS_CDN}/public/${cleanPrefix}/${site.id}/logo${extension}`;
};
