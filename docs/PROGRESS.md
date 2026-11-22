# 進捗（docs/SPEC.md §0-3）

セッションをまたいで再開するためのメモ。上が新しい。

## 決めたこと
- 2026-11-22 §13 の回答：Drive は個人のマイドライブ／ルートフォルダとサービスアカウントは未作成（SETUP.md 先行）／リポジトリ `shiinomoritoumonkai/shiinomori-archive`（公開、Pages は Actions 配信、独自ドメインなし）／Secrets は Environment「production」に `.env.example` と同名で／マップ画像とスポット一覧は未着（仮画像と付録 A）。
- 2026-11-22 技術選定：Vite + TypeScript(strict) + Preact、Vitest、Playwright、`@googleapis/drive`、`@fontsource/noto-sans-jp`、pnpm。Node 22 LTS。
- 2026-11-22 Vite の `base`：GitHub Variables の `PAGES_BASE` があればそれ、なければ `/<リポジトリ名>/`。

## 終わったこと
- 2026-11-22 **M4 年表・年のページ・ビューア**：§7.3〜7.5。年代索引（PC 左固定／1099px 以下は上の帯）、左右交互、1 年 1 枚、写真のない年は薄い年だけ、説明のみの年はリンク、年代・年代不明の行、時代区分の見出し（eras 空でも可）。年のページは 60 枚ずつ描画（監視点が近い間は続けて描画）、イベントの固定ナビ、前後の年、年表に戻ると元の位置。ビューアは年のページ・マップ共通（← →・スワイプ・Esc・前後 1 枚先読み・履歴に積む・原寸 DL とサイズ・Drive で開く・100MB 超の案内文・失敗時は灰色＋Drive で開く）。E2E 20 件（両幅）通過、axe 重大 0。12,000 枚フィクスチャで年表 19,231px（PC）/ 23,258px（スマホ）、最多年 961 枚を最後まで描画して応答あり。
- 2026-11-22 **ワイヤーとの差分**（PC 1280 / スマホ 390 で比較）：配置・寸法・文字サイズは一致。差分は (1) 写真のない年で説明だけある年は、年をアクセント色のリンクにした（ワイヤーは薄い灰色のみ）、(2) 年表の行は `<a>`（ワイヤーは `<button>`）、(3) 仮画像に ID の透かし文字が入る（フィクスチャだけ）。直さない理由：(1)(2) は §7.3 の「説明がある年は年のページへのリンク」「タップで移る」に沿うため。
- 2026-11-22 **M3 マップ**：§7.2。パン/ズーム（ドラッグ・ホイール・ピンチ・＋−・全体・ダブルタップ）、ピンは拡大しても同じ大きさ（下にあるピンほど手前）、PC は左に一覧・右に詳細、スマホは下のシート（一覧は引き上げ、詳細は 75dvh）、カテゴリ絞り込み、`?picker=1`（ピッカー中はピンを押せない）、スポットは `#/map?spot=<id>`、ビューアは `&p=<n>`。仮のマップ画像 `public/map/tanohata.svg`（2400×1800）。E2E のマップ 3 件通過。
- 2026-11-22 **M5 の一部**：`docs/OPERATIONS.md`。予算は JS gzip 18 KB、index.bin 0.7 KB、dist 6.6 MB（フォント込み）。
- 2026-11-22 **M0 完了**（`docs/SPIKE.md`）：実 Drive 594 枚（全 JPEG）で、lh3 と thumbnail の両方が表示可、同時 6 本で 429 ゼロ（12 本でもゼロ）、=w1600 が 0.5〜0.7 秒、原寸は警告ページなし、スコープは metadata.readonly で可、走査 668 件 5 秒。**rotation 奇数で幅高さ入れ替え**を `dimensionsOf` に反映。未測：HEIC/PNG（サンプルに無し）、resourceKey、100MB 超、他ブラウザ/他アカウント（稲葉さん実施）。
- 2026-11-22 **M1 の実 Drive 確認（1 回目）**：`pnpm ingest check` → 写真 594 枚、年 4（1986〜1989）、警告 23。フォルダ名が `1988夏`（年のあとに区切りなし）で BAD_YEAR_NAME ×7 → イベント名が「1988夏」・カテゴリ「その他」になる。`/1961/1960` の YEAR_MISMATCH ×1。マップ用フォルダは空（SPOT_WITHOUT_PHOTOS ×15）。**稲葉さんの判断待ち**（フォルダ名を直すか、規則/カテゴリ設定を緩めるか）。
- 2026-11-22 M2（Drive 非依存部分）：ハッシュルーター、鍵の導出と保存（localStorage、30 日）、入口、データの取得・復号・キャッシュ、`photoUrl`、画像キュー（同時 6 本・1/3/8 秒再試行・予備 URL）、ヘッダー/フッター、レポート画面、§8 の色・書体（Noto Sans JP を unicode-range 分割で自前配信、woff2 のみ）・20px、本番ビルドだけ CSP meta、`check:public`、GitHub Actions（PR はフィクスチャのみ／main と手動は environment: production で実データ → Pages）。E2E 6 件（390×844 と 1280×800）通過。**デプロイ先での確認は未検証（Drive の準備待ち）。**
- 2026-11-22 M1（Drive 非依存部分）：§4 の規則（`shared/`）と §4.3 のテスト 46 件、暗号（Web Crypto 共通実装）とテスト、取り込み CLI（build/check/verify、`--from`、`--save`）、フィクスチャ生成（12,000 枚相当）、`pnpm crypto:rotate`。フィクスチャで index.bin 0.7KB、データ全体 148KB。
- 2026-11-22 M0 の実測ツールを `local/spike/`（Git 管理外）に用意：listing.ts（走査・統計）、probe.ts（URL 形式 × 種別、uc download）、page.ts + serve.ts（計測ページ、スマホからも開ける）、measure.ts（Playwright で 429 率・時間・縦横）。手順は local/spike/README.md。`tools/drive/create-folders.gs`（§5.4）も作成。
- 2026-11-22 環境：Node 22（Homebrew node@22 をリンク。/opt/homebrew/bin が /usr/local/bin の Node 16 より先）、pnpm 12（corepack）、Playwright chromium。
- 2026-11-22 `.claude/settings.json`、`docs/SETUP.md`、`.env.example`、`CLAUDE.md`、この文書。

## いまの状態 / 次にやること
- 2026-11-22 push 済み（gh で `shiinomoritoumonkai` としてブラウザ認証。`gh auth setup-git`。scope に workflow が必要だった）。Actions の test ジョブは GitHub 上でも通過（E2E 20 件）。
- **仮データ版をデプロイ済み**：https://shiinomoritoumonkai.github.io/shiinomori-archive/ （合言葉 `demo-shiinomori-2026`）。手動実行の source=fixtures。実データ版は production の Secrets（SETUP.md 4.2）が未設定のため、push のたびに deploy ジョブが「SITE_PASSWORD がありません」で止まる（公開中の仮データ版はそのまま残る）。
- Secrets が入ったら：Actions を source=drive で実行 → デプロイ先で合言葉 → レポート → マップ → 年表を稲葉さんが PC と iPhone で確認（M2・M5 の締め）。CI ログに ID・名前・パスがないことを目視（今回のログは変数名のみで値は出ていなかった）。
- 稲葉さんの返事待ち：(1) フォルダ名 `1988夏` 形式（規則を緩めるか、改名するか）、(2) `/1961/1960`、(3) マップ用フォルダへの写真、(4) M0 の他環境確認（`local/spike/README.md` 手順 3）、(5) 実物のマップ画像とスポットの座標（`?picker=1`）。
- 残りの M5：実データでの通し確認（最多年の灰色残り 1% 未満）、SETUP.md の最終化（push 権限の項を追加済み）。
- E2E「年を選ぶ → …」が 1 回だけ `?p=0` で落ちたことがある（再現せず。2 回連続で 20 件通過）。再発したら年のページのタイルクリックのタイミングを疑う。

## 未検証・保留
- HEIC/PNG/TIFF の lh3 表示と原寸（サンプルに無し）。resourceKey の付け方（該当なし）。100MB 超の原寸（警告ページ）。
- デプロイ先での動作（push 後）。
