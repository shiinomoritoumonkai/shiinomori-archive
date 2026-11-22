// 鍵の導出と保存（SPEC §7.1）。合言葉はブラウザの外へ送らず、鍵の導出にだけ使う（§3.4 の 7）
import site from '../../config/site.json' with { type: 'json' };
import { deriveKey } from '../../shared/crypto.ts';
import { clearDataCache, getManifest, verifyKey, type Manifest } from './data.ts';

const STORAGE_KEY = 'shiinomori.session';

interface Stored {
  v: number;
  jwk: JsonWebKey;
  exp: number;
}

export type SessionState = { status: 'loading' } | { status: 'out' } | { status: 'in'; key: CryptoKey };

let state: SessionState = { status: 'loading' };
const listeners = new Set<(s: SessionState) => void>();

export function getSession(): SessionState {
  return state;
}

export function subscribeSession(fn: (s: SessionState) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function set(next: SessionState): void {
  state = next;
  for (const fn of listeners) fn(state);
}

function readStored(): Stored | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const s = JSON.parse(raw) as Stored;
    if (typeof s.v !== 'number' || typeof s.exp !== 'number' || !s.jwk) return undefined;
    return s;
  } catch {
    return undefined;
  }
}

async function importStored(s: Stored): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', s.jwk, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

/** 起動時：保存済みの鍵で check.bin を復号できれば通す */
export async function restoreSession(): Promise<SessionState> {
  try {
    const m = await getManifest();
    const s = readStored();
    if (s && s.v === m.v && s.exp > Date.now()) {
      const key = await importStored(s);
      await verifyKey(key);
      set({ status: 'in', key });
      return state;
    }
  } catch {
    /* 保存された鍵が使えない */
  }
  localStorage.removeItem(STORAGE_KEY);
  set({ status: 'out' });
  return state;
}

/** 合言葉 → 鍵を導出 → check.bin を復号。成功したら鍵を保存（30 日） */
export async function login(password: string): Promise<boolean> {
  const m: Manifest = await getManifest();
  const key = await deriveKey(password, m.kdf, true);
  try {
    await verifyKey(key);
  } catch {
    return false;
  }
  const jwk = await crypto.subtle.exportKey('jwk', key);
  const stored: Stored = { v: m.v, jwk, exp: Date.now() + site.sessionDays * 24 * 60 * 60 * 1000 };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    /* プライベートモードなどで保存できなくても、このセッションは通す */
  }
  set({ status: 'in', key });
  return true;
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEY);
  clearDataCache();
  set({ status: 'out' });
}
