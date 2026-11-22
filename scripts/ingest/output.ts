// public/data/ への暗号化出力（SPEC §6）
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deriveKey, encryptJson } from '../../shared/crypto.ts';
import type { CryptoConfig } from './config.ts';
import type { PipelineOutput } from './pipeline.ts';

export interface Manifest {
  v: number;
  kdf: { salt: string; iterations: number };
  builtAt: string;
}

export interface WrittenFiles {
  dir: string;
  sizes: Record<string, number>;
}

export async function writeData(out: PipelineOutput, password: string, crypto: CryptoConfig, dir: string): Promise<WrittenFiles> {
  const key = await deriveKey(password, { salt: crypto.kdf.salt, iterations: crypto.kdf.iterations }, false);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'y'), { recursive: true });
  const sizes: Record<string, number> = {};
  const put = async (rel: string, value: unknown): Promise<void> => {
    const blob = await encryptJson(key, value);
    writeFileSync(join(dir, rel), blob);
    sizes[rel] = blob.length;
  };
  const manifest: Manifest = { v: crypto.v, kdf: { salt: crypto.kdf.salt, iterations: crypto.kdf.iterations }, builtAt: out.index.builtAt };
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest));
  await put('check.bin', { ok: true, v: crypto.v });
  await put('index.bin', out.index);
  for (const [k, y] of out.years) await put(`y/${k}.bin`, y);
  await put('spots.bin', out.spots);
  await put('report.bin', out.report);
  return { dir, sizes };
}
