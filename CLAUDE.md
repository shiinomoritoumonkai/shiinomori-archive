# shiinomori-archive

思惟の森の会 写真アーカイブ（GitHub Pages ＋ Google Drive）。仕様は `docs/SPEC.md`、進捗は `docs/PROGRESS.md`。セッション開始時はこの 2 つを読む。

## コマンド（pnpm / Node 22）
- `pnpm dev` 開発サーバー／`pnpm build` ビルド／`pnpm preview`
- `pnpm test` Vitest／`pnpm e2e` Playwright（フィクスチャで実行）
- `pnpm fixtures` フィクスチャ生成 → `pnpm ingest build --from fixtures/listing.json`
- `pnpm ingest build|check|verify` 取り込み（`.env` が必要）
- `pnpm check:public` 公開物の検査／`pnpm crypto:rotate` 合言葉変更時

## 守ること（SPEC §3.4）
1. リポジトリ・公開サイト・CI ログに、Drive のファイル ID・フォルダ ID・合言葉・サービスアカウントの鍵を平文で出さない。
2. 2 つのルートフォルダ ID は秘密。置き場所は `.env` と GitHub Secrets だけ。
3. `.env` と鍵ファイルの中身を表示・要約・コミットしない。
4. `public/data/` は生成物。コミットしない。`local/` もコミットしない。
5. 合言葉なしで見られるのは入口だけ。
6. Drive の URL を組み立てるのは `src/lib/photoUrl.ts` 1 か所だけ。
7. 合言葉はブラウザの外へ送らない。
8. Drive に対しては読み取りだけ。
