# 初回セットアップ手順（docs/SPEC.md §12.3）

最初の 1 回だけ行う作業です。上から順に進めてください。所要時間は 30〜40 分です。
前提：Drive は**個人のマイドライブ**、リポジトリは `shiinomoritoumonkai/shiinomori-archive`（公開）、独自ドメインは最初は使いません。

> **守ること**
> - ID・鍵・合言葉の値は、`.env` と GitHub の Secrets にだけ書く。チャットや Issue には貼らない。
> - 鍵の JSON ファイルは `~/Downloads` など**リポジトリの外**に置く（リポジトリ内でも `*service-account*.json` は Git 管理外ですが、外に置くほうが安全です）。
> - 途中でエラーが出たら、画面の文言をそのままメモして相談してください（ID は伏せて）。

---

## 1. Google Cloud：サービスアカウントと鍵

1. https://console.cloud.google.com/ を、Drive を持っている Google アカウントで開く。
2. 画面上部のプロジェクト選択 →「新しいプロジェクト」→ 名前は `shiinomori-archive` → 作成。作成後、そのプロジェクトを選択する。
   - 「組織なし」のままでよい。請求先アカウントは不要（Drive API は無料枠で足ります）。
3. 左メニュー「API とサービス」→「ライブラリ」→ `Google Drive API` を検索 →「有効にする」。
4. 「API とサービス」→「認証情報」→「認証情報を作成」→「サービス アカウント」。
   - サービス アカウント名：`shiinomori-ingest`
   - 「作成して続行」→ ロールは**何も付けずに**「続行」→「完了」。
5. 一覧に出た `shiinomori-ingest@….iam.gserviceaccount.com` をクリック → 上のタブ「キー」→「鍵を追加」→「新しい鍵を作成」→ **JSON** → 作成。
   - JSON ファイルが自動でダウンロードされる。`~/Downloads` に置いたままでよい。
   - **このメールアドレスをメモ**しておく（次の手順で Drive の共有先に使う。メールアドレス自体は秘密ではない）。

## 2. Google Drive：2 つのルートフォルダ

マイドライブに、次の 2 つのフォルダを作る（名前は自由。ここでは例）。

| 用途 | フォルダ名の例 | 中身 |
|---|---|---|
| アーカイブ用（年表） | `思惟の森アーカイブ` | `1990年/1990年_夏合宿/…`（SPEC §4.1） |
| マップ用 | `思惟の森マップ` | `青鹿寮/`、`オマルペ山/`…（SPEC §4.4。スポット名は `config/spots.json` と一致させる） |

マップ用フォルダは、アーカイブ用フォルダの**中に置かない**でください。

### 2.1 共有設定（2 つのフォルダそれぞれに行う）

1. フォルダを右クリック →「共有」。
2. 「ユーザーやグループを追加」に、手順 1-5 でメモした**サービスアカウントのメールアドレス**を貼り、権限を**閲覧者**にして送信（通知のチェックは外してよい）。
3. 同じ画面の「一般的なアクセス」を「制限付き」から**「リンクを知っている全員」**に変え、役割は**閲覧者**にする →「完了」。
   - これがないと、サイトから写真が表示できません（SPEC §3.3 の前提）。

### 2.2 フォルダ ID を控える

フォルダを開いたときのブラウザの URL `https://drive.google.com/drive/folders/XXXXXXXX` の `XXXXXXXX` の部分が ID です。2 つ分を控えて、手順 3 と 4 で使います。

### 2.3 M0（検証スパイク）用の写真

アーカイブ用フォルダの中に `1990年/1990年_夏合宿/` のような形で、実際の写真を **200〜300 枚**入れてください。JPEG・PNG・HEIC（iPhone の写真）・大きなスキャン画像を混ぜると、検証の意味があります。縦位置の写真も数枚入れてください。
古い写真（2021 年より前に Drive に置いた、または他の人から共有されたもの）が混ざっていると、`resourceKey` の検証にもなります。

## 3. 手元の PC：`.env` を作る

ターミナルでリポジトリのフォルダに移動して：

```sh
cp .env.example .env
base64 -i ~/Downloads/＜ダウンロードした鍵＞.json | tr -d '\n' | pbcopy
```

`.env` をテキストエディタで開き、4 つの値を埋める：

| 変数 | 値 |
|---|---|
| `SITE_PASSWORD` | 開発中は仮の合言葉（12 文字以上） |
| `GOOGLE_SERVICE_ACCOUNT_KEY_B64` | 上のコマンドでクリップボードに入った 1 行を貼る |
| `DRIVE_ARCHIVE_ROOT_ID` | アーカイブ用フォルダの ID |
| `DRIVE_MAP_ROOT_ID` | マップ用フォルダの ID |

`.env` は `.gitignore` で Git 管理外、Claude Code からも読めない設定（`.claude/settings.json`）になっています。

## 4. GitHub：Pages・Environment・Secrets

リポジトリ https://github.com/shiinomoritoumonkai/shiinomori-archive の **Settings** で：

### 4.1 Pages
- 左メニュー「Pages」→「Build and deployment」→ Source を **GitHub Actions** にする。
- Custom domain は空のまま（最初は `https://shiinomoritoumonkai.github.io/shiinomori-archive/` で配信）。

### 4.2 Environment「production」
- 左メニュー「Environments」→「New environment」→ 名前 `production` → Configure。
- Deployment branches を「Selected branches and tags」にして `main` を追加（任意ですが推奨。プルリクエストから秘密の値が使われるのを防ぎます）。
- 同じ画面の **Environment secrets** に、`.env.example` と同じ名前で 4 つ追加：

| Name | 値 |
|---|---|
| `SITE_PASSWORD` | **本番の合言葉**（12 文字以上。手元の `.env` の仮の値とは別でよい） |
| `GOOGLE_SERVICE_ACCOUNT_KEY_B64` | 手順 3 と同じ 1 行 |
| `DRIVE_ARCHIVE_ROOT_ID` | アーカイブ用フォルダの ID |
| `DRIVE_MAP_ROOT_ID` | マップ用フォルダの ID |

Variables（公開してよい値）は、独自ドメインを使うときに `PAGES_BASE=/` を追加します（§5）。いまは不要です。

### 4.3 push する人の権限
- 手元の Mac から `git push` するアカウント（キーチェーンに保存されている GitHub アカウント）が、このリポジトリに書き込めることが必要です。リポジトリの所有者と違うアカウントで push するときは、Settings →「Collaborators」でそのアカウントを **Write** で追加してください。

### 4.4 Actions の権限
- 左メニュー「Actions」→「General」→「Workflow permissions」が **Read and write permissions** になっていなくてもよい（ワークフロー側で `pages: write` と `id-token: write` を個別に指定します）。既定のままで進めてください。

## 5. あとで：独自ドメインを使うとき

1. Settings → Pages → Custom domain にドメインを入れ、DNS に指示どおりの CNAME（または A/AAAA）を設定する。「Enforce HTTPS」をオンにする。
2. Settings → Secrets and variables → Actions → **Variables** に `PAGES_BASE` = `/` を追加する（Vite の `base` が `/shiinomori-archive/` から `/` に切り替わる）。
3. `main` に push するか、Actions の「Run workflow」で再デプロイする。

## 6. 合言葉を変えるとき（運用開始後。docs/OPERATIONS.md にも書く）

1. Environment「production」の `SITE_PASSWORD` を更新する。
2. 手元で `pnpm crypto:rotate` を実行して `config/crypto.json` の salt と版番号を更新し、コミットして push する。
3. デプロイ後、全員が新しい合言葉を再入力する。Drive 側の共有設定は変わらない。

## 7. 確認

手順 1〜3 まで終わったら、ターミナルで次を実行します（M0 で用意するスクリプト）：

```sh
pnpm ingest check
```

写真の枚数と警告が表示されれば、Google Cloud と Drive の準備は完了です。
`403` や `File not found` が出るときは、2.1 の共有先メールアドレスの綴りと、`.env` のフォルダ ID を確認してください。
