/**
 * The version the app shows (APP_VERSION_LABEL in the drawer footer and the
 * About hero) must be the version the stores see. One assertion per source
 * of truth: package.json, both iOS build configurations (Debug + Release in
 * project.pbxproj) and the Android defaultConfig.
 */
import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import {
  APP_BUILD,
  APP_VERSION,
  APP_VERSION_LABEL,
} from '../src/utils/constants/app';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const allMatches = (text: string, re: RegExp): string[] =>
  Array.from(text.matchAll(re), m => m[1]);

describe('app version alignment', () => {
  it('label is derived from the constants', () => {
    expect(APP_VERSION_LABEL).toBe(`Version ${APP_VERSION} (${APP_BUILD})`);
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(APP_BUILD).toMatch(/^\d+$/);
  });

  it('package.json version matches APP_VERSION', () => {
    const pkg = JSON.parse(read('package.json')) as { version: string };
    expect(pkg.version).toBe(APP_VERSION);
  });

  describe('iOS project.pbxproj', () => {
    const pbx = read('ios/PragmaticEnergySolution.xcodeproj/project.pbxproj');

    it('every MARKETING_VERSION equals APP_VERSION (Debug + Release)', () => {
      const versions = allMatches(pbx, /MARKETING_VERSION = ([^;]+);/g).map(v =>
        v.trim().replace(/^"|"$/g, ''),
      );
      expect(versions.length).toBeGreaterThanOrEqual(2);
      expect(new Set(versions)).toEqual(new Set([APP_VERSION]));
    });

    it('every CURRENT_PROJECT_VERSION equals APP_BUILD', () => {
      const builds = allMatches(pbx, /CURRENT_PROJECT_VERSION = ([^;]+);/g).map(
        v => v.trim().replace(/^"|"$/g, ''),
      );
      expect(builds.length).toBeGreaterThanOrEqual(2);
      expect(new Set(builds)).toEqual(new Set([APP_BUILD]));
    });
  });

  describe('android/app/build.gradle defaultConfig', () => {
    const gradle = read('android/app/build.gradle');

    it('versionName equals APP_VERSION', () => {
      const names = allMatches(gradle, /^\s*versionName\s+"([^"]+)"/gm);
      expect(names).toEqual([APP_VERSION]);
    });

    it('versionCode equals APP_BUILD', () => {
      const codes = allMatches(gradle, /^\s*versionCode\s+(\d+)/gm);
      expect(codes).toEqual([APP_BUILD]);
    });
  });
});
