import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadUrl, openUrl, photoUrl } from './photoUrl.ts';
import { seedOf } from '../../scripts/fixtures/placeholder.ts';

describe('photoUrl（SPEC 付録 B の形）', () => {
  it('用途ごとの幅を入れる', () => {
    expect(photoUrl({ id: 'abc' }, 'tile')).toBe('https://lh3.googleusercontent.com/d/abc=w400');
    expect(photoUrl({ id: 'abc' }, 'cover')).toBe('https://lh3.googleusercontent.com/d/abc=w800');
    expect(photoUrl({ id: 'abc' }, 'viewer')).toBe('https://lh3.googleusercontent.com/d/abc=w1600');
  });
  it('予備の URL', () => {
    expect(photoUrl({ id: 'abc' }, 'tile', 'fallback')).toBe('https://drive.google.com/thumbnail?id=abc&sz=w400');
  });
  it('resourceKey を付ける', () => {
    expect(photoUrl({ id: 'abc', rk: '0-xyz' }, 'tile')).toBe('https://lh3.googleusercontent.com/d/abc=w400?resourcekey=0-xyz');
    expect(photoUrl({ id: 'abc', rk: '0-xyz' }, 'tile', 'fallback')).toBe('https://drive.google.com/thumbnail?id=abc&sz=w400&resourcekey=0-xyz');
  });
  it('原寸と Drive で開く', () => {
    expect(downloadUrl({ id: 'abc' })).toBe('https://drive.google.com/uc?export=download&id=abc');
    expect(openUrl({ id: 'abc' })).toBe('https://drive.google.com/file/d/abc/view');
  });
});

describe('photoUrl（VITE_PHOTO_SOURCE=local）', () => {
  it('ID から data: URL を作り、1/40 の表示用 URL だけ失敗させる', () => {
    vi.stubEnv('VITE_PHOTO_SOURCE', 'local');
    let broken = 'x';
    for (let i = 0; i < 400; i++) if (seedOf(`id${i}`) % 40 === 0) { broken = `id${i}`; break; }
    expect(photoUrl({ id: 'abc' }, 'tile')).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    expect(photoUrl({ id: broken }, 'tile')).toBe('data:image/svg+xml,broken');
    expect(photoUrl({ id: broken }, 'tile', 'fallback')).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
  });
  afterEach(() => vi.unstubAllEnvs());
});
