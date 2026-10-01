/**
 * No WebView may manage the iOS status bar (chartConfig.ts WEBVIEW_SETTINGS).
 *
 * react-native-webview defaults `autoManageStatusBarEnabled` to true: it
 * re-applies the status-bar style it saw when the WebView was created on
 * every window show / hide (alerts, keyboards), which turned the bar
 * white-on-white in light mode after a chart had been drawn in dark mode.
 *
 * A source scan with the TypeScript parser (not a regex), driven by the
 * imports, so an aliased import, a later spread or a duplicate attribute
 * can't slip through:
 *  - every element whose local name is imported from
 *    'react-native-echarts-pro' must END with
 *    webViewSettings={WEBVIEW_SETTINGS} (nothing may override it after);
 *  - every element imported from 'react-native-webview' must end with
 *    autoManageStatusBarEnabled={false}.
 */
import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { WEBVIEW_SETTINGS } from '../src/components/screens/Authenticated/SiteDetail/components/chartConfig';

const SRC = path.join(__dirname, '..', 'src');

interface Violation {
  file: string;
  tag: string;
  reason: string;
}

/** Local names bound by imports from `moduleName` (default + named). */
const importedNames = (sf: ts.SourceFile, moduleName: string): Set<string> => {
  const names = new Set<string>();
  sf.statements.forEach(st => {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) return;
    if (st.moduleSpecifier.text !== moduleName || !st.importClause) return;
    const { name, namedBindings } = st.importClause;
    if (name) names.add(name.text);
    if (namedBindings && ts.isNamedImports(namedBindings)) {
      namedBindings.elements.forEach(el => names.add(el.name.text));
    }
  });
  return names;
};

/**
 * The attribute must be present, be the LAST attribute of that name, and
 * no spread may follow it (a later spread or duplicate wins at runtime).
 */
const lastWins = (
  attrs: ts.JsxAttributes,
  prop: string,
  isExpected: (expr: ts.Expression) => boolean,
): string | null => {
  const props = attrs.properties;
  let index = -1;
  props.forEach((p, i) => {
    if (ts.isJsxAttribute(p) && p.name.getText() === prop) index = i;
  });
  if (index < 0) return `missing ${prop}`;
  const attr = props[index] as ts.JsxAttribute;
  const init = attr.initializer;
  if (!init || !ts.isJsxExpression(init) || !init.expression || !isExpected(init.expression)) {
    return `${prop} has the wrong value`;
  }
  if (props.slice(index + 1).some(p => ts.isJsxSpreadAttribute(p))) {
    return `a spread after ${prop} can override it`;
  }
  return null;
};

const isSettings = (e: ts.Expression) => ts.isIdentifier(e) && e.text === 'WEBVIEW_SETTINGS';
const isFalse = (e: ts.Expression) => e.kind === ts.SyntaxKind.FalseKeyword;

/** Every WebView-backed element in one file that breaks the rule. */
export const checkSource = (file: string, code: string): { checked: number; violations: Violation[] } => {
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const charts = importedNames(sf, 'react-native-echarts-pro');
  const webViews = importedNames(sf, 'react-native-webview');
  const violations: Violation[] = [];
  let checked = 0;
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = node.tagName.getText(sf);
      let reason: string | null | undefined;
      if (charts.has(tag)) reason = lastWins(node.attributes, 'webViewSettings', isSettings);
      else if (webViews.has(tag)) reason = lastWins(node.attributes, 'autoManageStatusBarEnabled', isFalse);
      if (reason !== undefined) {
        checked += 1;
        if (reason) violations.push({ file, tag, reason });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { checked, violations };
};

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(tsx?|jsx?)$/.test(entry.name) ? [full] : [];
  });

describe('WebViews never manage the iOS status bar', () => {
  it('WEBVIEW_SETTINGS hands the status bar to RN <StatusBar> (and carries no dead keys)', () => {
    expect(WEBVIEW_SETTINGS).toEqual({ autoManageStatusBarEnabled: false });
  });

  it('every chart / WebView in src carries the setting', () => {
    let checked = 0;
    const violations: Violation[] = [];
    sourceFiles(SRC).forEach(file => {
      const r = checkSource(path.relative(SRC, file), fs.readFileSync(file, 'utf8'));
      checked += r.checked;
      violations.push(...r.violations);
    });
    expect(checked).toBeGreaterThanOrEqual(3); // Trends, Reports, fullscreen
    expect(violations).toEqual([]);
  });

  describe('the checker itself catches every way around the rule', () => {
    const ok = (code: string) => checkSource('probe.tsx', code).violations.length === 0;
    const CHART = "import RNEChartsPro from 'react-native-echarts-pro';\n";

    it('accepts the compliant forms', () => {
      expect(ok(`${CHART}const A = () => <RNEChartsPro option={o} webViewSettings={WEBVIEW_SETTINGS} />;`)).toBe(true);
      expect(
        ok(`${CHART}const A = () => (
          <RNEChartsPro
            {...base}
            option={{ fmt: '{a}}', f: () => ({ x: 1 }) }}
            webViewSettings={WEBVIEW_SETTINGS}
          />
        );`),
      ).toBe(true);
      expect(
        ok("import { WebView } from 'react-native-webview';\nconst A = () => <WebView source={s} autoManageStatusBarEnabled={false} />;"),
      ).toBe(true);
    });

    it('rejects a missing, wrong, overridden or aliased setting', () => {
      expect(ok(`${CHART}const A = () => <RNEChartsPro option={o} />;`)).toBe(false);
      expect(ok(`${CHART}const A = () => <RNEChartsPro webViewSettings={{}} />;`)).toBe(false);
      expect(ok(`${CHART}const A = () => <RNEChartsPro webViewSettings={WEBVIEW_SETTINGS} {...rest} />;`)).toBe(false);
      expect(
        ok(`${CHART}const A = () => <RNEChartsPro webViewSettings={WEBVIEW_SETTINGS} webViewSettings={{}} />;`),
      ).toBe(false);
      expect(
        ok(`${CHART}const A = () => <RNEChartsPro /* webViewSettings={WEBVIEW_SETTINGS} */ option={o} />;`),
      ).toBe(false);
      expect(
        ok("import Chart from 'react-native-echarts-pro';\nconst A = () => <Chart option={o} />;"),
      ).toBe(false);
      expect(ok("import WebView from 'react-native-webview';\nconst A = () => <WebView source={s} />;")).toBe(false);
      expect(
        ok(
          "import { WebView as W } from 'react-native-webview';\nconst A = () => <W autoManageStatusBarEnabled={true} />;",
        ),
      ).toBe(false);
    });
  });
});
