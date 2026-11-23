import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HEADER_HEIGHT, NAV_WIDTH_CLASSES, RAIL_WIDTH, SHELL_GUTTER, SIDEBAR_WIDTH } from '../shell';

/**
 * The alignment contract from shell.ts: PageContainer owns every page's
 * horizontal gutter, so content lines up with the header logo on every page.
 * Full-bleed routes (`handle: { bleed: true }` in router.tsx) are the only
 * pages that lay out their own gutter, and they must use SHELL_GUTTER.
 */
const ROOT = join(__dirname, '../../..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');
const PAGES_DIR = 'features/stays/pages';

/** Component names of the routes that opt out with handle.bleed. */
function bleedComponents(): Set<string> {
  const router = read('app/router.tsx');
  return new Set([...router.matchAll(/element:\s*<(\w+)\s*\/>,\s*handle:\s*\{\s*bleed:\s*true\s*\}/g)].map((m) => m[1]));
}

/** The JSX roots returned by a page file's default-exported component. */
function pageRoots(source: string): string[] {
  const start = source.search(/export default function \w+/);
  if (start === -1) return [];
  const end = source.indexOf('\n}\n', start);
  const body = source.slice(start, end === -1 ? undefined : end);
  return [...body.matchAll(/\n {2}return \(\n {4}<\w+[^>]*?className=(?:"([^"]*)"|\{[^}]*?"([^"]*)")/g)].map((m) => m[1] ?? m[2] ?? '');
}

const pageFiles = readdirSync(join(ROOT, PAGES_DIR)).filter((file) => file.endsWith('.tsx'));
const bleed = bleedComponents();
const isBleed = (file: string) => bleed.has(file.replace(/\.tsx$/, ''));

describe('shell geometry', () => {
  it('sizes the nav from one set of numbers', () => {
    expect(HEADER_HEIGHT).toBe(64);
    expect(NAV_WIDTH_CLASSES.expanded).toContain(`md:[--nav-w:${RAIL_WIDTH}px]`);
    expect(NAV_WIDTH_CLASSES.expanded).toContain(`lg:[--nav-w:${SIDEBAR_WIDTH}px]`);
    expect(NAV_WIDTH_CLASSES.collapsed).not.toContain('lg:');
  });

  it('the header and the page container share the gutter', () => {
    expect(read('components/layout/Header.tsx')).toContain('SHELL_GUTTER');
    expect(read('components/layout/PageContainer.tsx')).toContain('SHELL_GUTTER');
  });

  it('the main area clears the 64px header', () => {
    expect(read('components/layout/AppShell.tsx')).toMatch(/\bpt-16\b/);
    expect(read('components/layout/Header.tsx')).toMatch(/\bh-16\b/);
  });
});

describe('pages leave the gutter to PageContainer', () => {
  it('knows which routes are full-bleed', () => {
    expect(bleed).toEqual(new Set(['PropertyBuilderPage', 'StaysCustomersPage', 'NotFoundPage']));
  });

  it.each(pageFiles.filter((file) => !isBleed(file)))('%s declares no page gutter of its own', (file) => {
    const source = read(`${PAGES_DIR}/${file}`);
    expect(source, 'only full-bleed routes use SHELL_GUTTER').not.toContain('SHELL_GUTTER');
    expect(source).not.toContain(SHELL_GUTTER);
    for (const classes of pageRoots(source)) {
      expect(classes, `root of ${file}`).not.toMatch(/(^|\s)(px|pl|pr)-\d/);
    }
  });

  it.each(pageFiles.filter(isBleed))('%s (full-bleed) aligns with the shared gutter', (file) => {
    expect(read(`${PAGES_DIR}/${file}`)).toContain('SHELL_GUTTER');
  });
});
