import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { expectTypographyAndNoOverflow, loginAs } from './helpers.ts';

const isMobile = (w: number | undefined): boolean => (w ?? 1280) < 768;

test('マップ：ピン → パネル → ビューア → 前後 → 戻るで閉じる', async ({ page, viewport }) => {
  await loginAs(page, '/map');
  await page.waitForSelector('.map-stage.is-ready');
  await expectTypographyAndNoOverflow(page);

  // スポット一覧から開く（ピンは重なることがあるので、一覧経由で確実に）
  if (isMobile(viewport?.width)) await page.getByRole('button', { name: 'スポット一覧' }).click();
  await page.locator('.spot-list').getByRole('button', { name: /^青鹿寮/ }).click();
  await expect(page).toHaveURL(/#\/map\?spot=seiroku$/);
  const detail = page.locator('.detail');
  await expect(detail.getByRole('heading', { name: '青鹿寮' })).toBeVisible();
  await expect(detail.getByText('寮・暮らし')).toBeVisible();
  await expect(detail.getByText('せいろくりょう')).toBeVisible();
  const tiles = detail.locator('.tile-btn');
  const n = await tiles.count();
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThanOrEqual(16);
  await expectTypographyAndNoOverflow(page);

  // ピンをタップしても開く（スマホはシートを閉じてから。アクティブなピンは最前面）
  if (isMobile(viewport?.width)) await detail.getByRole('button', { name: '閉じる' }).click();
  await page.getByRole('button', { name: '全体を表示' }).click();
  await page.getByRole('button', { name: '北山崎ビジターセンター', exact: true }).click();
  await expect(page).toHaveURL(/#\/map\?spot=kitayamazaki$/);
  await expect(detail.getByRole('heading', { name: '北山崎ビジターセンター' })).toBeVisible();

  await detail.locator('.tile-btn').first().click();
  const viewer = page.getByRole('dialog');
  await expect(viewer).toBeVisible();
  await expect(page).toHaveURL(/&p=0$/);
  await expect(viewer.locator('img')).toBeVisible({ timeout: 20_000 });
  await expect(viewer.getByText('北山崎ビジターセンター')).toBeVisible();
  await expect(viewer.getByRole('link', { name: /原寸をダウンロード/ })).toBeVisible();
  await expect(viewer.getByRole('link', { name: 'Drive で開く' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/&p=1$/);
  await expectTypographyAndNoOverflow(page);
  await page.goBack();
  await expect(viewer).toHaveCount(0);
  await expect(page).toHaveURL(/#\/map\?spot=kitayamazaki$/);
  await page.keyboard.press('Escape');

  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
});

test('マップ：カテゴリで絞り込む', async ({ page, viewport }) => {
  await loginAs(page, '/map');
  await page.waitForSelector('.map-stage.is-ready');
  if (isMobile(viewport?.width)) await page.getByRole('button', { name: 'スポット一覧' }).click();
  const all = await page.locator('.spot-list li').count();
  await page.locator('.chips').getByRole('button', { name: '山作業' }).click();
  const forest = await page.locator('.spot-list li').count();
  expect(forest).toBeGreaterThan(0);
  expect(forest).toBeLessThan(all);
  await expect(page.locator('.pin.is-dim')).toHaveCount(all - forest);
  await page.locator('.chips').getByRole('button', { name: 'すべて' }).click();
  await expect(page.locator('.spot-list li')).toHaveCount(all);
});

test('マップ：?picker=1 で座標が取れる', async ({ page }) => {
  await loginAs(page, '/map?picker=1');
  await page.waitForSelector('.map-stage.is-ready');
  const stage = page.locator('.map-stage');
  const box = (await stage.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const status = page.getByRole('status');
  await expect(status.getByText(/x: \d+(\.\d+)?　y: \d+(\.\d+)?/)).toBeVisible();
  await expect(status.locator('.picker-code')).toContainText('"x":');
});
