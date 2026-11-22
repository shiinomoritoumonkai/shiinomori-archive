// pnpm fixtures：Drive API の応答と同じ形の仮の一覧（§4.3 のツリー ＋ 12,000 枚相当）を fixtures/listing.json に書く（SPEC §10 の 2）
// 画像は VITE_PHOTO_SOURCE=local のとき photoUrl が ID から data: URL で生成するので、ファイルは作らない。
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { file, flatten, folder, landscape, portrait, resetIds } from '../../shared/testTree.ts';
import type { DriveFile, Listing } from '../../shared/types.ts';
import type { FolderNode } from '../../shared/tree.ts';

resetIds();

function rng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const r = rng(20261122);

/** 縦横混在・撮影日時つき（年に合わせる）の写真を n 枚 */
function shots(n: number, year: number | undefined, month: number): DriveFile[] {
  const out: DriveFile[] = [];
  for (let i = 0; i < n; i++) {
    const isPortrait = r() < 0.25;
    const day = 1 + Math.floor(r() * 7);
    const spec = {
      name: `IMG_${String(i + 1).padStart(4, '0')}.jpg`,
      size: 2_000_000 + Math.floor(r() * 8_000_000),
      ...(year && r() < 0.8 ? { time: `${year}:${String(month).padStart(2, '0')}:${String(day).padStart(2, '0')} ${String(8 + Math.floor(r() * 10)).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')}:00` } : {}),
      ...(r() < 0.15 ? { description: `仮のキャプション ${i + 1}` } : {}),
    };
    out.push(isPortrait ? portrait(spec) : landscape(spec));
  }
  return out;
}

const FIRST = 1966;
const THIS_YEAR = new Date().getFullYear();
const EMPTY_YEARS = new Set([1967, 1973, 2020]);
const NOTE_ONLY_YEARS = new Set([1969]);

const root: FolderNode = folder('思惟の森アーカイブ');

// §4.3 のツリーに出てくる、例外的な形のフォルダ
root.files.push(file({ name: 'ルート直下.jpg' }), file({ name: 'ショートカット', shortcut: true }));
root.folders.push(
  folder('1968年', [folder('1968年_夏合宿', shots(3, 1968, 8)), folder('1968年_秋合宿', shots(2, 1968, 10))]),
  folder('1970年代', [file(), folder('1970年代_夏合宿', shots(2, undefined, 8)), folder('1975年', [folder('1975年_秋合宿', shots(1, 1975, 10))])]),
  folder('年不明', shots(2, undefined, 1)),
  folder('スキャン分', [folder('1982年', [folder('1982年_夏合宿', shots(1, 1982, 8))])]),
  folder('集合写真', shots(2, undefined, 1)),
  folder('_作業中', shots(5, undefined, 1)),
  folder('1990年_夏合宿 のコピー', shots(1, 1990, 8)),
  folder('3020年_未来', shots(1, undefined, 1)),
);

// 12,000 枚相当：1966〜今年。年ごとに春・夏・秋・祭り・その他
let total = 0;
for (let y = FIRST; y <= THIS_YEAR; y++) {
  if (EMPTY_YEARS.has(y)) continue;
  if (NOTE_ONLY_YEARS.has(y)) {
    root.folders.push(folder(`${y}年`, [], `${y}年は写真が見つかっていません。お持ちの方はご連絡ください。`));
    continue;
  }
  const events: FolderNode[] = [];
  const big = y === 2015; // いちばん写真の多い年
  const n = (base: number) => (big ? base * 8 : base + Math.floor(r() * base));
  events.push(folder(`${y}年_春合宿`, shots(n(28), y, 3), y % 7 === 0 ? '春合宿の説明文（仮）' : undefined));
  events.push(folder(`${y}年_夏合宿`, [...shots(n(50), y, 8), folder('オマルペ山', shots(n(8), y, 8)), folder('1日目', shots(n(6), y, 8))]));
  events.push(folder(`${y}年_秋合宿`, shots(n(28), y, 10)));
  if (r() < 0.7) events.push(folder(`${y}年_菅窪祭り`, shots(n(10), y, 9)));
  if (r() < 0.5) events.push(folder(`${y}年_早稲田祭`, shots(n(8), y, 11)));
  if (y === 1990) {
    events.push(folder('１９９０年＿夏合宿', shots(1, 1990, 8)), folder('夏合宿', shots(1, 1990, 8)), folder('1991年_秋合宿', shots(1, 1991, 10)));
  }
  if (y % 5 === 0) events[1]!.files.push(landscape({ name: '表紙_集合写真.jpg', time: `${y}:08:05 12:00:00` }));
  const yearFolder = folder(`${y}年`, events, y % 10 === 0 ? `${y}年の出来事（仮の説明文）。` : undefined);
  if (y === 1990) yearFolder.files.push(file({ name: '直下.jpg' }), file({ name: 'movie.mp4', mime: 'video/mp4' }));
  root.folders.push(yearFolder);
  total += events.reduce((a, e) => a + e.files.length + e.folders.reduce((b, f) => b + f.files.length, 0), 0);
}

// マップ用フォルダ
const mapRoot: FolderNode = folder('思惟の森マップ');
const spotNames = ['青鹿寮', '思惟の森', '芽株山', 'オマルペ山', '七滝山', '机浜番屋群', '島越漁港', 'ホテル羅賀荘', '北山崎ビジターセンター', '明戸海岸', '畠山神社', '田野畑村役場', '道の駅たのはた', '田野畑駅'];
for (const name of spotNames) {
  const n = 3 + Math.floor(r() * 20);
  const files: DriveFile[] = [];
  for (let i = 0; i < n; i++) {
    const y = 2022 + Math.floor(r() * 5);
    files.push(landscape({ name: `${name}_${i}.jpg`, time: `${y}:0${1 + Math.floor(r() * 9)}:1${Math.floor(r() * 9)} 10:00:00`, size: 3_000_000 }));
  }
  mapRoot.folders.push(folder(name, files));
}
mapRoot.folders.push(folder('知らない場所', shots(2, undefined, 1)));
mapRoot.files.push(file({ name: 'ルート直下.jpg' }));

const listing: Listing = {
  v: 1,
  fetchedAt: new Date().toISOString(),
  archiveRootId: root.id,
  mapRootId: mapRoot.id,
  files: [...flatten(root), ...flatten(mapRoot)],
};

const dir = resolve(process.cwd(), 'fixtures');
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, 'listing.json'), JSON.stringify(listing));
console.log(`fixtures/listing.json を書きました: ${listing.files.length} 件（年表の写真 約 ${total} 枚）`);
