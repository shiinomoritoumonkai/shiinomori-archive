import { expect, type Page } from '@playwright/test';
import { E2E_PASSWORD } from '../playwright.config.ts';

export async function loginAs(page: Page, path = '/timeline'): Promise<void> {
  await page.goto(`#${path}`);
  await expect(page).toHaveURL(/#\/login/);
  await page.getByLabel('合言葉').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'アーカイブに入る' }).click();
  await expect(page).toHaveURL(new RegExp(`#${path.replace(/[/?]/g, (c) => `\\${c}`)}`));
}

/** 見えている文字がすべて 20px 以上（マップのピンの名前を除く）。横方向のはみ出しがない */
export async function expectTypographyAndNoOverflow(page: Page): Promise<void> {
  const result = await page.evaluate(() => {
    const small: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    let n: Node | null;
    while ((n = walker.nextNode())) {
      if (!n.textContent?.trim()) continue;
      const el = n.parentElement;
      if (!el || seen.has(el)) continue;
      seen.add(el);
      if (el.closest('.pin-label')) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const size = parseFloat(cs.fontSize);
      if (size < 20) small.push(`${el.tagName.toLowerCase()}.${el.className}: ${size}px "${n.textContent.trim().slice(0, 20)}"`);
    }
    return { small, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  expect(result.small, '20px 未満の文字').toEqual([]);
  expect(result.overflow, '横方向のはみ出し').toBeLessThanOrEqual(0);
}
