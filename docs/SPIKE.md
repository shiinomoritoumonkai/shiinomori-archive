# M0 検証スパイクの記録（SPEC §11 M0）

実施日：2026-11-22。実際の Drive（個人のマイドライブ）に対して、`local/spike/` のスクリプトで計測した。ID は書かない。

## 対象

- アーカイブ用フォルダ：フォルダ 74、写真 594 枚（1986〜1989 年）、対象外 0、ショートカット 0。
- **すべて `image/jpeg`**。PNG・HEIC・TIFF・大きなスキャンは含まれていなかった（→「測れなかったこと」）。
- サイズ：中央値 1.3 MB、90% 1.7 MB、最大 2.2 MB。
- `resourceKey` 付き：0 / 594。幅・高さあり：594 / 594。撮影日時（EXIF）あり：8 / 594。
- `rotation`：0 が 12、1 が 261、2 が 114、3 が 93、なしが 114。
- 計測ページには 217 枚を載せた（rotation≠0 と縦位置を優先して混ぜた）。

## 1. URL の形 × ファイル種別（Node の fetch、未ログイン相当）

| 種別 | サイズ | rk | lh3 =w400 | thumbnail sz=w400 | lh3 =w1600 | uc?export=download |
|---|---|---|---|---|---|---|
| image/jpeg | 1.0MB | — | 200 image/jpeg 22KB 526ms | 200 image/jpeg 22KB 665ms | 200 image/jpeg 171KB 585ms | 200 image/jpeg 1004KB 1954ms |
| image/jpeg | 1.2MB | — | 200 image/jpeg 27KB 376ms | 200 image/jpeg 27KB 494ms | 200 image/jpeg 249KB 491ms | 200 image/jpeg 1156KB 1438ms |
| image/jpeg | 1.4MB | — | 200 image/jpeg 40KB 378ms | 200 image/jpeg 40KB 489ms | 200 image/jpeg 284KB 495ms | 200 image/jpeg 1340KB 2088ms |
| image/jpeg | 1.7MB | — | 200 image/jpeg 51KB 554ms | 200 image/jpeg 51KB 506ms | 200 image/jpeg 395KB 569ms | 200 image/jpeg 1650KB 1528ms |

- lh3 と thumbnail は同じ画像（同じバイト数）を返す。thumbnail は 302 で lh3 へリダイレクトする（ブラウザ計測で確認）。
- `uc?export=download` は 2.2 MB までの範囲では警告ページを挟まず、原寸の JPEG がそのまま返った。
- `resourceKey` 付きのファイルが無かったため、付け方（`?resourcekey=`）は未確認。現状の `photoUrl` は推測の形で付けている。

## 2. 4 列グリッド・遅延読み込み・同時 6 本（Playwright、1280×800、最後までスクロール）

| 条件 | 成功 / 失敗 | 429 | 所要時間（217 枚） | =w400 1 枚（中央値 / 90%） |
|---|---|---|---|---|
| lh3、同時 6 | 217 / 0 | 0（0.0%） | 11.8 秒 | 310ms / 384ms |
| thumbnail、同時 6 | 217 / 0 | 0（0.0%） | 19.8 秒 | 524ms / 554ms |
| lh3、同時 12 | 217 / 0 | 0（0.0%） | 6.9 秒 | 322ms / 523ms |

HTTP ステータスの内訳：lh3 は `200` のみ。thumbnail は `302`（drive.google.com）→ `200`（lh3）。失敗・タイムアウトなし。

## 3. 環境を変えた確認

PC の Chromium（Playwright、Google 未ログイン）で 2 を実施。**iOS Safari・Android Chrome・PC の Safari/Firefox・別アカウントでログイン中・プライベートウィンドウは未実施**（稲葉さんが `local/spike/README.md` の手順 3 で `node local/spike/serve.ts --lan` を起動し、各端末で開いて画面の件数を読む）。

## 4. 表示にかかる時間（20 枚、逐次）

| 条件 | =w800 中央値 / 90% / 最大 | =w1600 中央値 / 90% / 最大 |
|---|---|---|
| lh3 | 522 / 673 / 1090 ms | 540 / 731 / 739 ms |
| thumbnail | 519 / 716 / 758 ms | 547 / 685 / 686 ms |

- =w1600 でも 1 枚 0.5〜0.7 秒。ビューアの前後 1 枚ずつの先読みで十分。
- 原寸：2.2 MB 以下では警告ページなし（1 の表）。それより大きいファイルと HEIC の原寸は未確認。

## 5. 幅・高さと表示の縦横

`imageMediaMetadata` の幅・高さと、表示された画像（`naturalWidth/Height`）の比率を `rotation` 別に比べた：

| rotation | 枚数 | 縦横が不一致 | 比率が入れ替わっている | 比率が同じ |
|---|---|---|---|---|
| 0（なしを含む） | 103 | 0 | 0 | 103 |
| 1 | 72 | **72** | **72** | 0 |
| 2 | 27 | 0 | 0 | 27 |
| 3 | 15 | **15** | **15** | 0 |

→ **`rotation` が奇数のとき、幅と高さを入れ替える**（100% 一致）。`shared/archive.ts` の `dimensionsOf` に反映し、テストを追加した。

## 6. 走査

- 668 件（フォルダ 74 ＋ 写真 594）を **5.2〜5.7 秒**（並列 6）。1 フォルダあたり 80ms 前後なので、1 万〜5 万ファイル・1,000 フォルダ規模でも 2 分程度の見込み。
- スコープは **`drive.metadata.readonly` で足りた**（`files.list` と `imageMediaMetadata` が取れる）。

## 提案（config/site.json に反映済み）

| 項目 | 値 | 根拠 |
|---|---|---|
| 表示用 URL | `https://lh3.googleusercontent.com/d/{id}=w{w}` | thumbnail より速く、リダイレクトがない |
| 予備 URL | `https://drive.google.com/thumbnail?id={id}&sz=w{w}` | 同じ画像を返す。lh3 が落ちたときの逃げ道 |
| 同時読み込み | 6 本 | 429 ゼロ。12 本でもゼロだったが、規模が増えたときの余裕として 6 に据え置く |
| 再試行 | 1 → 3 → 8 秒、次に予備 URL | 失敗が出なかったので既定のまま |
| 幅 | タイル 400・表紙 800・ビューア 1600 | 既定のまま。1600 でも 0.5〜0.7 秒 |
| rotation | 奇数なら幅と高さを入れ替える | 5 の結果 |
| API スコープ | `drive.metadata.readonly` | 6 の結果 |
| CSP img-src | `lh3.googleusercontent.com`、`drive.google.com` | 実際に返ってきたホスト |

## 測れなかったこと（今後の確認）

1. **PNG・HEIC・TIFF・大きなスキャン**：サンプルに無かった。M1 以降で実データに混ざったら、`node local/spike/probe.ts` を再実行して表を更新する。特に HEIC の lh3 表示と原寸ダウンロードの形。
2. **資源キー（resourceKey）**：該当ファイルなし。古い共有ファイルが混ざったときに `pnpm ingest verify` で発覚する。
3. **100 MB 超のファイルの原寸ダウンロード**（警告ページの有無）。
4. **他の環境**（iOS Safari、Android、Safari/Firefox、別アカウント、プライベートウィンドウ）：稲葉さんが実施。
