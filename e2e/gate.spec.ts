import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { E2E_PASSWORD } from '../playwright.config.ts';
import { expectTypographyAndNoOverflow, loginAs } from './helpers.ts';

test('合言葉なしで /#/map と /#/timeline を開くと入口へ移る', async ({ page }) => {
  await page.goto('#/map');
  await expect(page).toHaveURL(/#\/login\?next=%2Fmap/);
  await page.goto('#/timeline');
  await expect(page).toHaveURL(/#\/login\?next=%2Ftimeline/);
  await expect(page.getByRole('heading', { name: '思惟の森の会 写真アーカイブ' })).toBeVisible();
  await expectTypographyAndNoOverflow(page);
});

test('違う合言葉でエラー → 正しい合言葉で入る → レポート → ログアウト', async ({ page }) => {
  await page.goto('#/report');
  await page.getByLabel('合言葉').fill('wrong-password-0000');
  await page.getByRole('button', { name: 'アーカイブに入る' }).click();
  await expect(page.getByRole('alert')).toHaveText('合言葉が違います');
  await page.getByLabel('合言葉').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'アーカイブに入る' }).click();
  await expect(page).toHaveURL(/#\/report$/);
  await expect(page.getByRole('heading', { name: '取り込みレポート' })).toBeVisible();
  await expect(page.getByText('写真の枚数')).toBeVisible();
  await expect(page.getByText('YEAR_MISMATCH')).toBeVisible();
  await expectTypographyAndNoOverflow(page);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);

  // 再読み込みしても保存した鍵で通る
  await page.reload();
  await expect(page.getByRole('heading', { name: '取り込みレポート' })).toBeVisible();

  await page.getByRole('button', { name: 'ログアウト' }).click();
  await expect(page).toHaveURL(/#\/login/);
  await page.goto('#/report');
  await expect(page).toHaveURL(/#\/login/);
});

test('入口の文字と axe', async ({ page }) => {
  await loginAs(page, '/report');
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
});
