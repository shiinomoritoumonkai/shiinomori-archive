# shiinomori-archive

思惟の森の会 資料アーカイブ（写真と、いずれ紙資料）のサイト。GitHub Pages（静的サイト）＋ Google Drive のフォルダ階層をそのまま読み込む。

- 仕様：`docs/SPEC.md`
- 初回セットアップ：`docs/SETUP.md`
- 進捗：`docs/PROGRESS.md`

## 仕組み

Drive のフォルダ（`年/年_イベント名`）を GitHub Actions が読み、写真の一覧を合言葉で暗号化して Pages に置く。写真本体は Drive に置いたまま、ブラウザが Drive の画像 URL を直接読む。サーバーは持たず、リポジトリには写真の一覧も ID も入れない。

## 了承済みの前提と限界（SPEC §3.3）

- **合言葉が守るのは「写真の一覧」まで。** 一覧（Drive のファイル ID を含む）は暗号化して配るので、合言葉なしでは写真にたどり着けない。ただし Drive 側は「リンクを知っている全員」の共有なので、写真 1 枚の URL が外に出れば、その写真は合言葉なしで見られる。
- **フォルダごとの共有は了承済み。** 写真 1 枚の ID が外に出ると、そこから親フォルダを辿って全体を見られる可能性があるが、これは受け入れる。
- 暗号化した一覧は誰でも取得できる場所に置くので、弱い合言葉は総当たりで破られる。合言葉は 12 文字以上。
- Drive の画像 URL は公式に保証されたものではない。形が変わったら `src/lib/photoUrl.ts` と `config/site.json` を直す。
- GitHub Free で Pages を使えるのは公開リポジトリだけ。だからリポジトリにはデータを一切置かない。
- Safari は、そのサイトを 7 日ほど操作しないと保存した鍵を消すことがある。その場合は合言葉の再入力になる。

## 地図画像

`public/map/tanohata.jpg` は田野畑村の観光マップで、発行元の使用許可を得て掲載している（2026-11-24 取得）。

## 開発

```sh
pnpm install
pnpm fixtures                                         # 仮の一覧を作る（Drive なし）
SITE_PASSWORD=dev-password-12345 pnpm ingest build --from fixtures/listing.json
pnpm dev                                              # http://localhost:5173/shiinomori-archive/
pnpm test                                             # 単体テスト
pnpm e2e:prepare && pnpm e2e                          # E2E（Playwright）
```

実際の Drive を読むには `.env`（`docs/SETUP.md`）を用意して `pnpm ingest check` / `pnpm ingest build`。

## 更新の流れ（運用）

Drive でフォルダを整理 → GitHub の Actions 画面で「Run workflow」→ 数分で反映 → サイトの `/#/report` で枚数と警告を確認。
