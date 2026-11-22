// public/data/ の取得・復号・キャッシュ（SPEC §6・§7.1）
import { decryptJson } from '../../shared/crypto.ts';
import type { Index, Report, SpotsData, YearData, YearKey } from '../../shared/types.ts';

export interface Manifest {
  v: number;
  kdf: { salt: string; iterations: number };
  builtAt: string;
}

const base = import.meta.env.BASE_URL;
let manifestPromise: Promise<Manifest> | undefined;
const cache = new Map<string, Promise<unknown>>();

export async function getManifest(): Promise<Manifest> {
  manifestPromise ??= fetch(`${base}data/manifest.json`, { cache: 'no-cache' }).then(async (r) => {
    if (!r.ok) throw new Error(`manifest ${r.status}`);
    return (await r.json()) as Manifest;
  });
  return manifestPromise;
}

export async function fetchBlob(rel: string): Promise<Uint8Array> {
  const m = await getManifest();
  const r = await fetch(`${base}data/${rel}?b=${encodeURIComponent(m.builtAt)}`);
  if (!r.ok) throw new Error(`${rel} ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

/** 鍵が合っているかの確認。合わなければ例外 */
export async function verifyKey(key: CryptoKey): Promise<void> {
  const v = await decryptJson<{ ok: boolean }>(key, await fetchBlob('check.bin'));
  if (!v.ok) throw new Error('check failed');
}

function cached<T>(key: CryptoKey, rel: string): Promise<T> {
  let p = cache.get(rel) as Promise<T> | undefined;
  if (!p) {
    p = fetchBlob(rel).then((b) => decryptJson<T>(key, b));
    cache.set(rel, p);
    p.catch(() => cache.delete(rel));
  }
  return p;
}

export const getIndex = (key: CryptoKey): Promise<Index> => cached(key, 'index.bin');
export const getYear = (key: CryptoKey, yearKey: YearKey): Promise<YearData> => cached(key, `y/${encodeURIComponent(yearKey)}.bin`);
export const getSpots = (key: CryptoKey): Promise<SpotsData> => cached(key, 'spots.bin');
export const getReport = (key: CryptoKey): Promise<Report> => cached(key, 'report.bin');

export function clearDataCache(): void {
  cache.clear();
}
