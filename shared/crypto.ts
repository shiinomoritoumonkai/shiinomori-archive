// docs/SPEC.md §6「暗号化」。Node 22 とブラウザの両方で同じコードを使う（Web Crypto ＋ CompressionStream）。
//   鍵：PBKDF2-HMAC-SHA256 → AES-256-GCM
//   blob：IV（12 バイト）| 暗号文 | 認証タグ（16 バイト）。平文は gzip した JSON

export interface KdfParams {
  salt: string; // base64
  iterations: number;
}

const IV_BYTES = 12;

/** 合言葉は NFKC で正規化し、前後の空白を除いてから UTF-8 にする（ビルド側とブラウザ側で同じ処理） */
export function normalizePassword(password: string): string {
  return password.normalize('NFKC').trim();
}

export function base64ToBytes(b64: string): Bytes {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export async function deriveKey(password: string, kdf: KdfParams, extractable = true): Promise<CryptoKey> {
  const subtle = globalThis.crypto.subtle;
  const material = await subtle.importKey('raw', new TextEncoder().encode(normalizePassword(password)), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: base64ToBytes(kdf.salt) as BufferSource, iterations: kdf.iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    extractable,
    ['encrypt', 'decrypt'],
  );
}

type Bytes = Uint8Array<ArrayBuffer>;

async function pipeBytes(input: Uint8Array, stream: GenericTransformStream): Promise<Bytes> {
  const src = new Blob([input as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(src).arrayBuffer());
}

export async function gzip(bytes: Uint8Array): Promise<Bytes> {
  return pipeBytes(bytes, new CompressionStream('gzip'));
}

export async function gunzip(bytes: Uint8Array): Promise<Bytes> {
  return pipeBytes(bytes, new DecompressionStream('gzip'));
}

/** JSON → gzip → AES-GCM。IV は blob ごとに乱数 */
export async function encryptJson(key: CryptoKey, value: unknown): Promise<Bytes> {
  const plain = await gzip(new TextEncoder().encode(JSON.stringify(value)));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = new Uint8Array(await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain as BufferSource));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return out;
}

/** 復号に失敗したら例外（合言葉違い・改ざん） */
export async function decryptJson<T = unknown>(key: CryptoKey, blob: Uint8Array): Promise<T> {
  if (blob.length < IV_BYTES + 16) throw new Error('blob too short');
  const iv = blob.subarray(0, IV_BYTES) as unknown as BufferSource;
  const ct = blob.subarray(IV_BYTES) as unknown as BufferSource;
  const plain = new Uint8Array(await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct));
  const json = await gunzip(plain);
  return JSON.parse(new TextDecoder().decode(json)) as T;
}

export function randomSaltBase64(): string {
  return bytesToBase64(globalThis.crypto.getRandomValues(new Uint8Array(16)));
}
