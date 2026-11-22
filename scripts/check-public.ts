// pnpm check:public（SPEC §10 の 5）：dist/ に秘密や平文の一覧がないこと、生成物が Git 管理外であること、予算内であること
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = process.cwd();
const dist = join(root, 'dist');
const problems: string[] = [];
const notes: string[] = [];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

if (!existsSync(dist)) {
  console.error('dist/ がありません。先に pnpm build を実行してください');
  process.exit(1);
}

const files = walk(dist);
const textExt = /\.(html|js|css|json|txt|svg|webmanifest)$/;

// 1. 秘密の値（.env にあれば）が dist に含まれていない
const secrets = ['DRIVE_ARCHIVE_ROOT_ID', 'DRIVE_MAP_ROOT_ID', 'SITE_PASSWORD'].map((k) => process.env[k]).filter((v): v is string => !!v && v.length >= 8);
// 2. Drive の ID らしき文字列（25 文字以上の英数字・_・-）が平文のテキストにない
const idLike = /(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{25,}(?![A-Za-z0-9_-])/g;
const allowList = [/^sha(256|384|512)-/, /^data:/];

for (const f of files) {
  const rel = relative(dist, f);
  if (rel.startsWith('data/') && rel.endsWith('.bin')) continue;
  if (!textExt.test(rel)) continue;
  const text = readFileSync(f, 'utf8');
  for (const s of secrets) if (text.includes(s)) problems.push(`${rel}: 秘密の値が含まれています`);
  if (rel === 'data/manifest.json') continue;
  if (rel.endsWith('.json') && text.includes('"yearKey"')) problems.push(`${rel}: 平文の一覧らしき JSON があります`);
  const hits = (text.match(idLike) ?? []).filter((h) => !allowList.some((a) => a.test(h)) && !/^[a-f0-9]+$/i.test(h) && !/^[A-Za-z]+$/.test(h));
  // JS バンドルには base64 や長い識別子が混ざるので、Drive の ID の特徴（大文字小文字と数字が混ざった 28〜44 文字、ハイフン/アンダースコアを含みうる）に絞る
  const suspicious = hits.filter((h) => h.length >= 28 && h.length <= 44 && /[A-Z]/.test(h) && /[a-z]/.test(h) && /[0-9]/.test(h) && /[-_]/.test(h));
  if (suspicious.length) notes.push(`${rel}: Drive の ID に似た文字列 ${suspicious.length} 件（${suspicious.slice(0, 3).join(', ')}）`);
}

// 3. public/data/・.env・local/・fixtures/ が Git の管理外
for (const p of ['public/data/x', '.env', 'local/x', 'fixtures/x']) {
  try {
    execFileSync('git', ['check-ignore', '-q', p], { cwd: root });
  } catch {
    problems.push(`${p.replace(/\/x$/, '/')} が .gitignore に入っていません`);
  }
}
try {
  const tracked = execFileSync('git', ['ls-files', 'public/data', '.env', 'local', 'fixtures'], { cwd: root, encoding: 'utf8' }).trim();
  if (tracked) problems.push(`Git に追跡されているファイルがあります: ${tracked.split('\n').join(', ')}`);
} catch {
  /* git なし */
}

// 4. 予算：最初の画面の JS は gzip 後 150KB 以内、index.bin は 10KB 以内
const indexHtml = readFileSync(join(dist, 'index.html'), 'utf8');
const entryScripts = [...indexHtml.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]!).filter((s) => !s.startsWith('http'));
const modulePreloads = [...indexHtml.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)].map((m) => m[1]!);
let jsGz = 0;
for (const s of [...entryScripts, ...modulePreloads]) {
  const p = join(dist, s.replace(/^\/?[^/]*\//, '').replace(/^\//, ''));
  const candidates = [p, join(dist, s.replace(/^\//, ''))];
  const found = candidates.find((c) => existsSync(c)) ?? files.find((f) => f.endsWith(s.split('/').pop()!));
  if (found) jsGz += gzipSync(readFileSync(found)).length;
}
notes.push(`最初の画面の JS: gzip 後 ${(jsGz / 1024).toFixed(1)} KB（上限 150 KB）`);
if (jsGz > 150 * 1024) problems.push(`JS が予算を超えています: ${(jsGz / 1024).toFixed(1)} KB`);
const indexBin = join(dist, 'data/index.bin');
if (existsSync(indexBin)) {
  const size = statSync(indexBin).size;
  notes.push(`index.bin: ${(size / 1024).toFixed(1)} KB（上限 10 KB）`);
  if (size > 10 * 1024) problems.push(`index.bin が予算を超えています: ${(size / 1024).toFixed(1)} KB`);
} else {
  notes.push('data/index.bin がありません（ingest build 前のビルド）');
}

for (const n of notes) console.log(`  ${n}`);
if (problems.length) {
  for (const p of problems) console.error(`✗ ${p}`);
  process.exit(1);
}
console.log('✓ check:public OK');
