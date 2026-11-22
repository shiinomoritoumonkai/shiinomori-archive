# 進捗（docs/SPEC.md §0-3）

セッションをまたいで再開するためのメモ。上が新しい。

## 決めたこと
- 2026-11-22 §13 の回答：Drive は個人のマイドライブ／ルートフォルダとサービスアカウントは未作成（SETUP.md 先行）／リポジトリ `shiinomoritoumonkai/shiinomori-archive`（公開、Pages は Actions 配信、独自ドメインなし）／Secrets は Environment「production」に `.env.example` と同名で／マップ画像とスポット一覧は未着（仮画像と付録 A）。
- 2026-11-22 技術選定：Vite + TypeScript(strict) + Preact、Vitest、Playwright、`@googleapis/drive`、`@fontsource/noto-sans-jp`、pnpm。Node 22 LTS。
- 2026-11-22 Vite の `base`：GitHub Variables の `PAGES_BASE` があればそれ、なければ `/<リポジトリ名>/`。

## 終わったこと
- 2026-11-22 M2（Drive 非依存部分）：ハッシュルーター、鍵の導出と保存（localStorage、30 日）、入口、データの取得・復号・キャッシュ、`photoUrl`、画像キュー（同時 6 本・1/3/8 秒再試行・予備 URL）、ヘッダー/フッター、レポート画面、§8 の色・書体（Noto Sans JP を unicode-range 分割で自前配信、woff2 のみ）・20px、本番ビルドだけ CSP meta、`check:public`、GitHub Actions（PR はフィクスチャのみ／main と手動は environment: production で実データ → Pages）。E2E 6 件（390×844 と 1280×800）通過。**デプロイ先での確認は未検証（Drive の準備待ち）。**
- 2026-11-22 M1（Drive 非依存部分）：§4 の規則（`shared/`）と §4.3 のテスト 46 件、暗号（Web Crypto 共通実装）とテスト、取り込み CLI（build/check/verify、`--from`、`--save`）、フィクスチャ生成（12,000 枚相当）、`pnpm crypto:rotate`。フィクスチャで index.bin 0.7KB、データ全体 148KB。
- 2026-11-22 M0 の実測ツールを `local/spike/`（Git 管理外）に用意：listing.ts（走査・統計）、probe.ts（URL 形式 × 種別、uc download）、page.ts + serve.ts（計測ページ、スマホからも開ける）、measure.ts（Playwright で 429 率・時間・縦横）。手順は local/spike/README.md。`tools/drive/create-folders.gs`（§5.4）も作成。
- 2026-11-22 環境：Node 22（Homebrew node@22 をリンク。/opt/homebrew/bin が /usr/local/bin の Node 16 より先）、pnpm 12（corepack）、Playwright chromium。
- 2026-11-22 `.claude/settings.json`、`docs/SETUP.md`、`.env.example`、`CLAUDE.md`、この文書。

## いまの状態 / 次にやること
- **Drive の準備待ち**（稲葉さんが SETUP.md の 1〜3 を実施）。`.env` ができたら：
  1. `pnpm ingest check` で接続確認。
  2. M0：`local/spike/` のスクリプトで実測 → `docs/SPIKE.md` に数字 → `config/site.json` の URL 形式・並列数・再試行を確定 → **止まって報告**。
  3. M1 の締め：実 Drive で `pnpm ingest check` の結果を見せる → 稲葉さんがフォルダを直す → **止まって報告**。
  4. M2 の締め：push → Actions → デプロイ先で合言葉 → レポート画面。CI ログに ID・名前・パスがないことを目視。
- そのあと M3（マップ）→ M4（年表・年のページ・ビューア）→ M5。画面の作り込みは M0 の結果が出てから。
- まだ push していない（稲葉さんの指示待ち）。

## 未検証・保留
- `drive.metadata.readonly` で足りるか（M0）。
- `rotation` が奇数のときの幅高さの入れ替え（M0）。
