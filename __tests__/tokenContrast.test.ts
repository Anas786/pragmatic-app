/**
 * WCAG 2.x contrast for the declared colour-role pairs, in BOTH schemes.
 *
 * Roles (see the "Colour roles" design decision): energyPalette / semantic
 * are FILLS; text and icons use ink roles. Every ink role must stay AA
 * (4.5:1) on the surfaces it is allowed on, text on solid brand/energy
 * fills is `textOnBrand`, and form-field outlines (`borderStrong`) need the
 * 3:1 non-text minimum. Translucent tokens (statusSoft, brandSoft) are
 * composited over the surface before measuring.
 */
import { describe, expect, it } from '@jest/globals';
import {
  ColorScheme,
  darkScheme,
  energyPalette,
  lightScheme,
  semantic,
  touch,
  type as typeRamp,
} from '../src/theme/tokens';
import { heroTint } from '../src/components/screens/Authenticated/Dashboard/siteCardModel';

type RGB = [number, number, number];

const parseColor = (c: string): { rgb: RGB; a: number } => {
  // #RRGGBB, or #RRGGBBAA (an alpha-suffixed accent, e.g. the hero tint).
  const hex = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(c);
  if (hex) {
    const h = hex[1];
    return {
      rgb: [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as RGB,
      a: hex[2] ? parseInt(hex[2], 16) / 255 : 1,
    };
  }
  const rgba = /^rgba?\(([^)]+)\)$/i.exec(c);
  if (rgba) {
    const parts = rgba[1].split(',').map(p => Number(p.trim()));
    return { rgb: [parts[0], parts[1], parts[2]], a: parts[3] ?? 1 };
  }
  throw new Error(`unparsable colour ${c}`);
};

/** Alpha-composite `fg` over an opaque `bg`. */
const over = (fg: string, bg: string): RGB => {
  const f = parseColor(fg);
  const b = parseColor(bg);
  if (b.a !== 1) throw new Error(`background must be opaque: ${bg}`);
  return f.rgb.map((v, i) => f.a * v + (1 - f.a) * b.rgb[i]) as RGB;
};

const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: RGB) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

/** Contrast of `fg` (may be translucent) on opaque `bg`. */
const contrast = (fg: string, bg: string): number => {
  const l1 = luminance(over(fg, bg));
  const l2 = luminance(parseColor(bg).rgb);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
};

/** Contrast of `fg` on a translucent `fill` composited over `base`. */
const contrastOnTint = (fg: string, fill: string, base: string): number => {
  const tinted = over(fill, base);
  const hex = `#${tinted.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
  return contrast(fg, hex);
};

const AA = 4.5;
const NON_TEXT = 3;

const SCHEMES: [string, ColorScheme][] = [
  ['light', lightScheme],
  ['dark', darkScheme],
];

describe.each(SCHEMES)('%s scheme', (name, s) => {
  const surfaces = {
    bg: s.bg,
    surface: s.surface,
    surfaceMuted: s.surfaceMuted,
    surfaceRaised: s.surfaceRaised,
  };

  it.each(['textPrimary', 'textSecondary', 'textTertiary'] as const)(
    '%s is AA on every surface',
    key => {
      // Collect failures so a regression names the surface that broke.
      const failing = Object.entries(surfaces)
        .map(([surfaceName, surface]) => [surfaceName, contrast(s[key], surface)] as const)
        .filter(([, ratio]) => ratio < AA);
      expect(failing).toEqual([]);
    },
  );

  it('textOnBrand is AA on the brand fill and on every energy fill', () => {
    expect(contrast(s.textOnBrand, s.brand)).toBeGreaterThanOrEqual(AA);
    for (const fill of Object.values(energyPalette)) {
      expect(contrast(s.textOnBrand, fill)).toBeGreaterThanOrEqual(AA);
    }
  });

  it('textOnBrand is AA on the Pill count well (brandBold)', () => {
    expect(contrast(s.textOnBrand, s.brandBold)).toBeGreaterThanOrEqual(AA);
  });

  it('brandText, energyInk.* and statusInk.* are AA on bg and surface', () => {
    const inks = [
      s.brandText,
      ...Object.values(s.energyInk),
      ...Object.values(s.statusInk),
    ];
    for (const ink of inks) {
      expect(contrast(ink, s.bg)).toBeGreaterThanOrEqual(AA);
      expect(contrast(ink, s.surface)).toBeGreaterThanOrEqual(AA);
    }
  });

  it('statusInk is AA on its own statusSoft pill fill (over bg and surface)', () => {
    for (const role of ['success', 'warning', 'danger', 'info'] as const) {
      expect(contrastOnTint(s.statusInk[role], s.statusSoft[role], s.bg)).toBeGreaterThanOrEqual(AA);
      expect(
        contrastOnTint(s.statusInk[role], s.statusSoft[role], s.surface),
      ).toBeGreaterThanOrEqual(AA);
    }
  });

  it('brandText initials are AA on the Avatar brandSoft fill', () => {
    expect(contrastOnTint(s.brandText, s.brandSoft, s.surface)).toBeGreaterThanOrEqual(AA);
    expect(contrastOnTint(s.brandText, s.brandSoft, s.bg)).toBeGreaterThanOrEqual(AA);
  });

  it('hero text is AA on every brand-hero gradient stop', () => {
    for (const stop of s.heroGradient) {
      expect(contrast(s.heroOnGradient, stop)).toBeGreaterThanOrEqual(AA);
      expect(contrast(s.heroOnGradientMuted, stop)).toBeGreaterThanOrEqual(AA);
    }
  });

  it('hero text is AA on every danger-hero gradient stop', () => {
    for (const stop of s.heroDangerGradient) {
      expect(contrast(s.heroOnGradient, stop)).toBeGreaterThanOrEqual(AA);
      expect(contrast(s.heroDangerOnGradientMuted, stop)).toBeGreaterThanOrEqual(AA);
    }
  });

  it('energyInk overlines are AA on every stop of the Dashboard hero tint (over surface)', () => {
    // The SiteCard hero overline is normal-size text in energyInk on its
    // own source's tint, composited over the card surface.
    const failing = (Object.keys(energyPalette) as (keyof typeof energyPalette)[])
      .flatMap(source =>
        heroTint(energyPalette[source], name === 'dark').colors.map(
          stop => [source, stop, contrastOnTint(s.energyInk[source], stop, s.surface)] as const,
        ),
      )
      .filter(([, , ratio]) => ratio < AA);
    expect(failing).toEqual([]);
  });

  it('borderStrong meets the 3:1 non-text minimum on surface', () => {
    expect(contrast(s.borderStrong, s.surface)).toBeGreaterThanOrEqual(NON_TEXT);
  });

  it('statusSoft is the semantic hue at the scheme alpha', () => {
    const alpha = s === lightScheme ? 0.12 : 0.16;
    for (const role of ['success', 'warning', 'danger', 'info'] as const) {
      const soft = parseColor(s.statusSoft[role]);
      expect(soft.a).toBeCloseTo(alpha, 5);
      expect(soft.rgb).toEqual(parseColor(semantic[role]).rgb);
    }
  });
});

describe('token shape', () => {
  it('text on brand is dark ink in BOTH themes', () => {
    expect(lightScheme.textOnBrand).toBe('#0A0E1A');
    expect(darkScheme.textOnBrand).toBe('#0A0E1A');
  });

  it('touch targets: 44pt iOS (jest default platform) and a 36pt pill', () => {
    expect(touch.min).toBe(44);
    expect(touch.pillVisual).toBe(36);
  });

  it('micro type is the 11pt floor', () => {
    expect(typeRamp.micro).toEqual({ size: 11, line: 14, weight: '500', tracking: 0.2 });
  });
});

describe('useScheme / useThemedStyles referential stability', () => {
  it('returns the identical scheme object across calls within a mode', () => {
    const { LIGHT_SCHEME, DARK_SCHEME } = require('../src/theme/useThemedStyles');
    const { useThemeStore } = require('../src/hooks/useThemeStore');
    const { useScheme } = require('../src/theme');
    const React = require('react');
    const renderer = require('react-test-renderer');

    const seen: unknown[] = [];
    const Probe = () => {
      seen.push(useScheme());
      return null;
    };
    useThemeStore.setState({ isDark: true });
    let tree: any;
    renderer.act(() => {
      tree = renderer.create(React.createElement(Probe));
    });
    renderer.act(() => tree.update(React.createElement(Probe)));
    expect(seen[0]).toBe(DARK_SCHEME);
    expect(seen[1]).toBe(seen[0]);

    renderer.act(() => useThemeStore.setState({ isDark: false }));
    expect(seen[seen.length - 1]).toBe(LIGHT_SCHEME);
    renderer.act(() => tree.update(React.createElement(Probe)));
    expect(seen[seen.length - 1]).toBe(seen[seen.length - 2]);
    renderer.act(() => tree.unmount());
  });

  it('useThemedStyles shares ONE sheet per factory per mode across instances', () => {
    const { useThemeStore } = require('../src/hooks/useThemeStore');
    const { useThemedStyles } = require('../src/theme');
    const React = require('react');
    const renderer = require('react-test-renderer');

    const factory = (s: ColorScheme) => ({ box: { backgroundColor: s.surface } });
    const sheets: unknown[] = [];
    const Probe = () => {
      sheets.push(useThemedStyles(factory));
      return null;
    };
    useThemeStore.setState({ isDark: true });
    let tree: any;
    renderer.act(() => {
      tree = renderer.create(
        React.createElement(React.Fragment, null, React.createElement(Probe), React.createElement(Probe)),
      );
    });
    expect(sheets).toHaveLength(2);
    expect(sheets[0]).toBe(sheets[1]);
    renderer.act(() => useThemeStore.setState({ isDark: false }));
    const light = sheets[sheets.length - 1];
    expect(light).not.toBe(sheets[0]);
    renderer.act(() => useThemeStore.setState({ isDark: true }));
    expect(sheets[sheets.length - 1]).toBe(sheets[0]);
    renderer.act(() => tree.unmount());
  });
});
