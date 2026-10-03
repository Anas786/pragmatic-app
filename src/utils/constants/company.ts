/**
 * Company / app identity strings — the ONE place they live. Screens import
 * these instead of hard-coding names, addresses or URLs.
 *
 * Naming is intentional (see project memory): the App Store listing is
 * "Pragmatic Engineering Solution", the in-app brand is "Pragmatic Energy
 * Solution", and the legal entity in About/Terms is written "Pragmatic
 * Engineering Solutions". Product still has to confirm the canonical legal
 * name (singular vs plural) — change COMPANY_NAME here only.
 */

/** In-app product name (headers, splash copy). */
export const APP_DISPLAY_NAME = 'Pragmatic Energy Solution';

/** Legal entity used in About / Terms / copyright lines. */
export const COMPANY_NAME = 'Pragmatic Engineering Solutions';

export const SUPPORT_EMAIL = 'info@pragmaticeng.com';

export const WEBSITE_URL = 'https://pragmaticeng.com/';

/** Public privacy policy (also the Play / App Store listing URL). Screens hide
 * the link while null. */
export const PRIVACY_POLICY_URL: string | null =
  'https://pragmaticeng.com/privacy-policy/';

/** "Last updated" stamp shown on Terms and Conditions. */
export const LEGAL_UPDATED_AT = 'February 2026';
