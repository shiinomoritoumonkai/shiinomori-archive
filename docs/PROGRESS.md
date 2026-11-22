# 進捗（docs/SPEC.md §0-3）

セッションをまたいで再開するためのメモ。上が新しい。

## 決めたこと
- 2026-11-22 §13 の回答：Drive は個人のマイドライブ／ルートフォルダとサービスアカウントは未作成（SETUP.md 先行）／リポジトリ `shiinomoritoumonkai/shiinomori-archive`（公開、Pages は Actions 配信、独自ドメインなし）／Secrets は Environment「production」に `.env.example` と同名で／マップ画像とスポット一覧は未着（仮画像と付録 A）。
- 2026-11-22 技術選定：Vite + TypeScript(strict) + Preact、Vitest、Playwright、`@googleapis/drive`、`@fontsource/noto-sans-jp`、pnpm。Node 22 LTS。
- 2026-11-22 Vite の `base`：GitHub Variables の `PAGES_BASE` があればそれ、なければ `/<リポジトリ名>/`。

## 終わったこと
- 2026-11-22 **M0 完了**（`docs/SPIKE.md`）：実 Drive 594 枚（全 JPEG）で、lh3 と thumbnail の両方が表示可、同時 6 本で 429 ゼロ（12 本でもゼロ）、=w1600 が 0.5〜0.7 秒、原寸は警告ページなし、スコープは metadata.readonly で可、走査 668 件 5 秒。**rotation 奇数で幅高さ入れ替え**を `dimensionsOf` に反映。未測：HEIC/PNG（サンプルに無し）、resourceKey、100MB 超、他ブラウザ/他アカウント（稲葉さん実施）。
- 2026-11-22 **M1 の実 Drive 確認（1 回目）**：`pnpm ingest check` → 写真 594 枚、年 4（1986〜1989）、警告 23。フォルダ名が `1988夏`（年のあとに区切りなし）で BAD_YEAR_NAME ×7 → イベント名が「1988夏」・カテゴリ「その他」になる。`/1961/1960` の YEAR_MISMATCH ×1。マップ用フォルダは空（SPOT_WITHOUT_PHOTOS ×15）。**稲葉さんの判断待ち**（フォルダ名を直すか、規則/カテゴリ設定を緩めるか）。
- 2026-11-22 M2（Drive 非依存部分）：ハッシュルーター、鍵の導出と保存（localStorage、30 日）、入口、データの取得・復号・キャッシュ、`photoUrl`、画像キュー（同時 6 本・1/3/8 秒再試行・予備 URL）、ヘッダー/フッター、レポート画面、§8 の色・書体（Noto Sans JP を unicode-range 分割で自前配信、woff2 のみ）・20px、本番ビルドだけ CSP meta、`check:public`、GitHub Actions（PR はフィクスチャのみ／main と手動は environment: production で実データ → Pages）。E2E 6 件（390×844 と 1280×800）通過。**デプロイ先での確認は未検証（Drive の準備待ち）。**
- 2026-11-22 M1（Drive 非依存部分）：§4 の規則（`shared/`）と §4.3 のテスト 46 件、暗号（Web Crypto 共通実装）とテスト、取り込み CLI（build/check/verify、`--from`、`--save`）、フィクスチャ生成（12,000 枚相当）、`pnpm crypto:rotate`。フィクスチャで index.bin 0.7KB、データ全体 148KB。
- 2026-11-22 M0 の実測ツールを `local/spike/`（Git 管理外）に用意：listing.ts（走査・統計）、probe.ts（URL 形式 × 種別、uc download）、page.ts + serve.ts（計測ページ、スマホからも開ける）、measure.ts（Playwright で 429 率・時間・縦横）。手順は local/spike/README.md。`tools/drive/create-folders.gs`（§5.4）も作成。
- 2026-11-22 環境：Node 22（Homebrew node@22 をリンク。/opt/homebrew/bin が /usr/local/bin の Node 16 より先）、pnpm 12（corepack）、Playwright chromium。
- 2026-11-22 `.claude/settings.json`、`docs/SETUP.md`、`.env.example`、`CLAUDE.md`、この文書。

## いまの状態 / 次にやること
- **M0・M1 の報告で停止中。稲葉さんの返事待ち**：
  1. フォルダ名 `1988夏` 形式の扱い（§4.2-2 の規則どおり「年として読まない」か、`YYYY` 直後に季節が続く形も許すか）。カテゴリ規則に「春」「夏」「秋」の短縮形を足すか。
  2. `/1961/1960` の意図。マップ用フォルダへの写真投入。
  3. M0 の他環境確認（iPhone 等。`local/spike/README.md` 手順 3、`--lan`）。
  4. push の許可 → Actions → デプロイ先で合言葉 → レポート画面（M2 の締め）。
- そのあと M3（マップ）→ M4（年表・年のページ・ビューア）→ M5。
- まだ push していない。

## 未検証・保留
- HEIC/PNG/TIFF の lh3 表示と原寸（サンプルに無し）。resourceKey の付け方（該当なし）。100MB 超の原寸（警告ページ）。
- デプロイ先での動作（push 後）。
