// pnpm ingest build | check | verify [--from <listing.json>] [--save <listing.json>]（SPEC §5.3）
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { photoUrl } from '../../src/lib/photoUrl.ts';
import type { Listing, PhotoRef, Report } from '../../shared/types.ts';
import { loadConfig } from './config.ts';
import { fetchListing, readDriveEnv } from './drive.ts';
import { writeData } from './output.ts';
import { runPipeline, type PipelineOutput } from './pipeline.ts';

const args = process.argv.slice(2);
const command = args[0];
const opt = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const CI = process.env.CI === 'true';
const DATA_DIR = resolve(process.cwd(), 'public/data');

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function getListing(): Promise<Listing> {
  const from = opt('--from');
  if (from) {
    const listing = JSON.parse(readFileSync(resolve(from), 'utf8')) as Listing;
    if (!CI) console.log(`一覧を読みました: ${from}（${listing.files.length} 件）`);
    return listing;
  }
  const env = readDriveEnv();
  const { site } = loadConfig();
  const started = Date.now();
  let lastLog = 0;
  const listing = await fetchListing(env, {
    concurrency: site.images.concurrency,
    onProgress: (done, queued, files) => {
      if (CI || Date.now() - lastLog < 2000) return;
      lastLog = Date.now();
      process.stdout.write(`\r  フォルダ ${done} 件読了・待ち ${queued}・ファイル ${files} 件`);
    },
  });
  if (!CI) process.stdout.write('\n');
  console.log(`Drive の走査: ${listing.files.length} 件、${((Date.now() - started) / 1000).toFixed(1)} 秒`);
  const save = opt('--save');
  if (save) {
    writeFileSync(resolve(save), JSON.stringify(listing));
    console.log(`一覧を保存しました: ${save}（ID を含むのでコミットしない）`);
  }
  return listing;
}

function printSummary(out: PipelineOutput): void {
  const r = out.report;
  console.log(`写真 ${r.photoCount} 枚、年 ${r.years.length}、警告 ${r.warnings.reduce((a, w) => a + w.count, 0)} 件`);
  const byCode = new Map<string, number>();
  for (const w of r.warnings) byCode.set(w.code, (byCode.get(w.code) ?? 0) + w.count);
  for (const [code, n] of byCode) console.log(`  ${code}: ${n}`);
  const ex = Object.entries(r.excluded);
  if (ex.length) console.log(`対象外: ${ex.map(([k, v]) => `${k} ${v}`).join(', ')}`);
}

function printDetail(out: PipelineOutput): void {
  const r = out.report;
  console.log('\n■ 年ごとのイベント（年のページに並ぶ順）');
  console.log('年\tカテゴリ\tイベント名\t枚数');
  for (const y of r.years) {
    for (const e of y.events) console.log(`${y.yearKey}\t${e.category}\t${e.label || '—'}\t${e.count}`);
  }
  console.log('\n■ 年の表紙（named = 「表紙」で指定、auto = 自動）');
  console.log(r.years.map((y) => `${y.yearKey}:${y.cover}${y.hasNote ? '+説明' : ''}`).join('  '));
  console.log('\n■ マップ');
  for (const s of r.map) console.log(`  ${s.name}\t${s.count} 枚`);
  console.log('\n■ 警告');
  if (r.warnings.length === 0) console.log('  なし');
  for (const w of r.warnings) console.log(`  ${w.code}\t${w.path || '/'}\t${w.count}`);
  console.log('\n■ 対象外ファイル');
  const ex = Object.entries(r.excluded);
  if (ex.length === 0) console.log('  なし');
  for (const [k, v] of ex) console.log(`  ${k}\t${v}`);
  console.log('');
  printSummary(out);
}

function checkMinimum(out: PipelineOutput): void {
  const { site } = loadConfig();
  if (out.photoCount === 0) fail('取り込めた写真が 0 枚です。共有設定とフォルダ ID を確認してください');
  if (out.photoCount < site.minPhotos) fail(`写真が ${site.minPhotos} 枚未満です（${out.photoCount} 枚）`);
}

async function build(): Promise<void> {
  const { pipeline, crypto } = loadConfig();
  const password = process.env.SITE_PASSWORD;
  if (!password) fail('SITE_PASSWORD がありません');
  if (password.normalize('NFKC').trim().length < 12) fail('合言葉は 12 文字以上にしてください');
  const listing = await getListing();
  const out = runPipeline(listing, pipeline);
  checkMinimum(out);
  const written = await writeData(out, password, crypto, DATA_DIR);
  const total = Object.values(written.sizes).reduce((a, b) => a + b, 0);
  console.log(`public/data/ に ${Object.keys(written.sizes).length + 1} ファイル、計 ${(total / 1024).toFixed(1)} KB（index.bin ${((written.sizes['index.bin'] ?? 0) / 1024).toFixed(1)} KB）`);
  printSummary(out);
}

async function check(): Promise<void> {
  const { pipeline } = loadConfig();
  const listing = await getListing();
  const out = runPipeline(listing, pipeline);
  if (CI) printSummary(out);
  else printDetail(out);
  checkMinimum(out);
}

/** 共有設定の確認：各年の表紙、各イベントから 1 枚、マップの全写真を、未ログインの状態で取得してみる */
async function verify(): Promise<void> {
  const { pipeline } = loadConfig();
  const listing = await getListing();
  const out = runPipeline(listing, pipeline);
  const targets: { label: string; ref: PhotoRef }[] = [];
  for (const y of out.index.years) if (y.cover) targets.push({ label: `${y.yearKey} 表紙`, ref: y.cover });
  for (const [k, y] of out.years) {
    for (const e of y.events) {
      const p = e.photos[0];
      if (p) targets.push({ label: `${k} ${e.label || e.category}`, ref: p });
    }
  }
  for (const s of out.spots.spots) for (const p of s.photos) targets.push({ label: `マップ ${s.name}`, ref: p });
  console.log(`${targets.length} 枚を取得してみます…`);
  let ok = 0;
  const failed: string[] = [];
  const status: Record<string, number> = {};
  const limit = 4;
  let i = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (i < targets.length) {
        const t = targets[i++]!;
        try {
          const res = await fetch(photoUrl(t.ref, 'tile'), { redirect: 'follow' });
          status[res.status] = (status[res.status] ?? 0) + 1;
          if (res.ok && (res.headers.get('content-type') ?? '').startsWith('image/')) ok++;
          else failed.push(`${t.label}: ${res.status}`);
          await res.arrayBuffer();
        } catch (e) {
          failed.push(`${t.label}: ${(e as Error).message}`);
        }
        await new Promise((r) => setTimeout(r, 150));
      }
    }),
  );
  console.log(`成功 ${ok} / ${targets.length}。HTTP ステータス: ${JSON.stringify(status)}`);
  if (failed.length) {
    console.log('失敗:');
    for (const f of failed.slice(0, 50)) console.log(`  ${f}`);
    if (failed.length > 50) console.log(`  …ほか ${failed.length - 50} 件`);
    process.exit(1);
  }
}

export type { Report };

const commands: Record<string, () => Promise<void>> = { build, check, verify };
const run = command ? commands[command] : undefined;
if (!run) {
  console.error('使い方: pnpm ingest build|check|verify [--from listing.json] [--save listing.json]');
  process.exit(2);
}
run().catch((e: unknown) => {
  if (CI) fail('取り込みに失敗しました（詳細はローカルで pnpm ingest check を実行）');
  console.error(e);
  process.exit(1);
});
