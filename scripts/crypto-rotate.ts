// 合言葉を変えるときだけ実行する：salt を作り直し、版番号 v を上げる（SPEC §6）
import { readFileSync, writeFileSync } from 'node:fs';
import { randomSaltBase64 } from '../shared/crypto.ts';

const path = new URL('../config/crypto.json', import.meta.url);
const cfg = JSON.parse(readFileSync(path, 'utf8')) as { v: number; kdf: { salt: string; iterations: number; name: string; hash: string }; cipher: string };
const init = process.argv.includes('--init');
if (init && cfg.kdf.salt) {
  console.log('salt は設定済みです。合言葉を変えるときは --init なしで実行してください。');
  process.exit(0);
}
cfg.kdf.salt = randomSaltBase64();
if (!init) cfg.v += 1;
writeFileSync(path, JSON.stringify(cfg, null, 2) + '\n');
console.log(`config/crypto.json を更新しました（v=${cfg.v}）。コミットして push すると、全員が合言葉を再入力することになります。`);
