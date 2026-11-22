# 進捗（docs/SPEC.md §0-3）

セッションをまたいで再開するためのメモ。上が新しい。

## 決めたこと
- 2026-11-22 §13 の回答：Drive は個人のマイドライブ／ルートフォルダとサービスアカウントは未作成（SETUP.md 先行）／リポジトリ `shiinomoritoumonkai/shiinomori-archive`（公開、Pages は Actions 配信、独自ドメインなし）／Secrets は Environment「production」に `.env.example` と同名で／マップ画像とスポット一覧は未着（仮画像と付録 A）。
- 2026-11-22 技術選定：Vite + TypeScript(strict) + Preact、Vitest、Playwright、`@googleapis/drive`、`@fontsource/noto-sans-jp`、pnpm。Node 22 LTS。
- 2026-11-22 Vite の `base`：GitHub Variables の `PAGES_BASE` があればそれ、なければ `/<リポジトリ名>/`。

## 終わったこと
- 2026-11-22 `.claude/settings.json`、`docs/SETUP.md`、`.env.example`、`CLAUDE.md`、この文書。

## いまの状態 / 次にやること
- M0 は Drive の準備待ち（稲葉さんが SETUP.md の 1〜3 を実施中）。
- 先に M1 の Drive に触らない部分（§4 の規則とテスト、§6 の型と暗号、フィクスチャ）を進める。
- Drive の準備ができたら `local/spike/` を作って M0 を実測 → `docs/SPIKE.md` → 止まって報告。

## 未検証・保留
- `drive.metadata.readonly` で足りるか（M0）。
- `rotation` が奇数のときの幅高さの入れ替え（M0）。
