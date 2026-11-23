import { expect, type Page } from '@playwright/test';

/** Minimum touch target, per WCAG 2.5.5 / Apple HIG. */
export const MIN_TAP_TARGET = 44;

/** The page must never scroll sideways at the current viewport. */
export async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, `page scrolls horizontally (${scrollWidth}px > ${clientWidth}px)`).toBeLessThanOrEqual(
    clientWidth,
  );
}

export type TapTargetViolation = { label: string; width: number; height: number };

/**
 * Every visible interactive element inside `scope` whose box is smaller than
 * 44×44. Inline text links inside running copy are exempt (WCAG 2.5.8
 * "inline" exception), as are elements that opt out with
 * `data-tap-exempt` — reserve that for things like dense calendar cells that
 * have a larger hit area through their parent.
 */
export async function findSmallTapTargets(page: Page, scope = 'body'): Promise<TapTargetViolation[]> {
  return page.evaluate(
    ({ scope, min }) => {
      const root = document.querySelector(scope);
      if (!root) return [];
      const selector =
        'a[href], button, [role="button"], [role="tab"], [role="menuitem"], [role="option"], [role="switch"], input:not([type="hidden"]), select, textarea, summary';
      const out: { label: string; width: number; height: number }[] = [];
      for (const el of Array.from(root.querySelectorAll<HTMLElement>(selector))) {
        if (el.closest('[data-tap-exempt]')) continue;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        // Inline links in a sentence are exempt.
        if (el.tagName === 'A' && style.display === 'inline' && el.parentElement?.tagName === 'P') continue;
        // Visually-hidden inputs whose label is the real target (Radix, checkboxes).
        if (el.tagName === 'INPUT' && (rect.width <= 1 || style.opacity === '0')) continue;
        if (rect.width < min - 0.5 || rect.height < min - 0.5) {
          const label =
            el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 40) || el.tagName.toLowerCase();
          out.push({ label, width: Math.round(rect.width), height: Math.round(rect.height) });
        }
      }
      return out;
    },
    { scope, min: MIN_TAP_TARGET },
  );
}

export async function expectTapTargets(page: Page, scope = 'body') {
  const small = await findSmallTapTargets(page, scope);
  expect(small, `tap targets under ${MIN_TAP_TARGET}px: ${JSON.stringify(small)}`).toEqual([]);
}

/** Open the mobile drawer when the viewport is below the rail breakpoint. */
export async function openNavIfCollapsed(page: Page) {
  const toggle = page.getByRole('button', { name: /open menu|toggle menu/i });
  if (await toggle.isVisible()) await toggle.click();
}
