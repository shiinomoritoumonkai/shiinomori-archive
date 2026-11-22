import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { expectTypographyAndNoOverflow, loginAs } from './helpers.ts';

test('年表のトップ：1 年 1 枚、イベント名・説明文は出さない、年代の索引', async ({ page }) => {
  await loginAs(page, '/timeline');
  await page.waitForSelector('.tl .yr');
  // 画像の数 = 写真のある年・年代・年不明のまとまりの数（index.bin の cover の数）。フィクスチャは 1966〜今年（空の年 3 つ、説明のみ 1 つ）＋ 1970年代 ＋ 年代不明
  const thisYear = new Date().getFullYear();
  const expected = thisYear - 1966 + 1 - 3 - 1 + 2;
  await expect(page.locator('.tl .yr-ph')).toHaveCount(expected);
  await expect(page.locator('.tl a.yr')).toHaveCount(expected + 1); // 説明のみの年もリンク
  const text = await page.locator('.tl').innerText();
  for (const word of ['春合宿', '夏合宿', '秋合宿', '菅窪祭り', '早稲田祭', '仮の説明文', '枚']) expect(text, `年表に「${word}」が出ている`).not.toContain(word);
  expect(text).toContain('昭和41年');
  expect(text).toContain('1970年代');
  expect(text).toContain('年代不明');
  await expectTypographyAndNoOverflow(page);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);

  // 年代の索引で移動
  await page.getByRole('button', { name: '2000年代' }).click();
  const y2000 = page.locator('.tl [data-decade="2000"]').first();
  await expect.poll(async () => (await y2000.boundingBox())!.y, { timeout: 8000 }).toBeLessThan(400);
  await expect(page.getByRole('button', { name: '2000年代' })).toHaveAttribute('aria-current', 'location');
});

test('年を選ぶ → 年のページ → ビューアの前後 → 戻る → 元の位置', async ({ page }) => {
  await loginAs(page, '/timeline');
  const link = page.locator('a.yr[href="#/timeline/1990"]');
  await link.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const before = await page.evaluate(() => window.scrollY);
  expect(before).toBeGreaterThan(1000);
  await link.click();
  await expect(page).toHaveURL(/#\/timeline\/1990$/);
  await expect(page.getByRole('heading', { name: '1990' })).toBeVisible();
  await expect(page.getByText('平成2年')).toBeVisible();
  await expect(page.getByText('1990年の出来事（仮の説明文）。')).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'この年のイベント' });
  await expect(nav.getByRole('button').first()).toHaveText('春合宿');
  await expect(page.locator('.ev').first().getByRole('heading')).toHaveText('春合宿');
  await expectTypographyAndNoOverflow(page);

  const tiles = page.locator('.year .tile-btn');
  await tiles.nth(1).click();
  const viewer = page.getByRole('dialog');
  await expect(viewer).toBeVisible();
  await expect(page).toHaveURL(/\?p=1$/);
  await expect(viewer.locator('img')).toBeVisible({ timeout: 20_000 });
  await expect(viewer.getByText('1990年 春合宿')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/\?p=2$/);
  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(/\?p=1$/);
  await page.keyboard.press('Escape');
  await expect(viewer).toHaveCount(0);
  await expect(page).toHaveURL(/#\/timeline\/1990$/);

  // 前後の年
  await expect(page.getByRole('link', { name: '1991 →' })).toBeVisible();
  await expect(page.getByRole('link', { name: '← 1989' })).toBeVisible();

  await page.getByRole('link', { name: '← 年表' }).click();
  await expect(page).toHaveURL(/#\/timeline$/);
  await page.waitForSelector('.tl .yr');
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => window.scrollY);
  expect(Math.abs(after - before)).toBeLessThan(5);
});

test('年代だけ分かる写真と年代不明のページ', async ({ page }) => {
  await loginAs(page, '/timeline/1970s');
  await expect(page.getByRole('heading', { name: '1970年代' })).toBeVisible();
  await expect(page.locator('.year .wa')).toHaveText('年不明');
  await loginAs(page, '/timeline/unknown').catch(() => {});
  await page.goto('#/timeline/unknown');
  await expect(page.getByRole('heading', { name: '年代不明' })).toBeVisible();
});

test('いちばん写真の多い年を最後までスクロールしても固まらない', async ({ page }) => {
  await loginAs(page, '/timeline/2015');
  await page.waitForSelector('.year .grid');
  const total = await page.evaluate(() => [...document.querySelectorAll('.ev .cnt')].reduce((a, e) => a + parseInt(e.textContent ?? '0', 10), 0));
  const t0 = Date.now();
  for (let i = 0; i < 120; i++) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(50);
    if ((await page.locator('.year .tile-btn').count()) >= total) break;
  }
  const rendered = await page.locator('.year .tile-btn').count();
  expect(rendered).toBeGreaterThanOrEqual(total);
  expect(Date.now() - t0).toBeLessThan(20_000);
  // 描画後もページが応答する
  await expect(page.getByRole('link', { name: '← 年表' })).toBeVisible();
});
