import { createCipheriv, pbkdf2Sync } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { base64ToBytes, decryptJson, deriveKey, encryptJson, normalizePassword, randomSaltBase64 } from './crypto.ts';

const kdf = { salt: 'AAECAwQFBgcICQoLDA0ODw==', iterations: 1000 }; // テストなので反復は少なく

describe('crypto（SPEC §6）', () => {
  it('暗号化 → 復号で元に戻る', async () => {
    const key = await deriveKey('もりのかい-password', kdf);
    const value = { v: 1, years: [{ yearKey: '1990', count: 3 }] };
    const blob = await encryptJson(key, value);
    expect(await decryptJson(key, blob)).toEqual(value);
  });

  it('違う合言葉では失敗する', async () => {
    const key = await deriveKey('もりのかい-password', kdf);
    const other = await deriveKey('もりのかい-passwore', kdf);
    const blob = await encryptJson(key, { a: 1 });
    await expect(decryptJson(other, blob)).rejects.toThrow();
  });

  it('改ざんすると失敗する', async () => {
    const key = await deriveKey('もりのかい-password', kdf);
    const blob = await encryptJson(key, { a: 1 });
    blob[20] = (blob[20] ?? 0) ^ 0xff;
    await expect(decryptJson(key, blob)).rejects.toThrow();
  });

  it('合言葉の表記ゆれ（全角・前後の空白・NFD）でも同じ鍵になる', async () => {
    expect(normalizePassword('　ｐａｓｓ１２３４５６７８　')).toBe('pass12345678');
    expect(normalizePassword('がぎぐ'.normalize('NFD'))).toBe('がぎぐ');
    const a = await deriveKey('pass12345678', kdf);
    const b = await deriveKey('　ｐａｓｓ１２３４５６７８ ', kdf);
    const blob = await encryptJson(a, { ok: true });
    expect(await decryptJson(b, blob)).toEqual({ ok: true });
  });

  it('Node の crypto（createCipheriv）で作った blob も復号できる（形式の互換）', async () => {
    const raw = pbkdf2Sync(Buffer.from(normalizePassword('pass12345678'), 'utf8'), base64ToBytes(kdf.salt), kdf.iterations, 32, 'sha256');
    const iv = Buffer.alloc(12, 7);
    const cipher = createCipheriv('aes-256-gcm', raw, iv);
    const plain = gzipSync(Buffer.from(JSON.stringify({ via: 'node' })));
    const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
    const tag = cipher.getAuthTag();
    const blob = new Uint8Array(Buffer.concat([iv, ct, tag]));
    const key = await deriveKey('pass12345678', kdf);
    expect(await decryptJson(key, blob)).toEqual({ via: 'node' });
  });

  it('salt は 16 バイト', () => {
    expect(base64ToBytes(randomSaltBase64()).length).toBe(16);
  });
});
