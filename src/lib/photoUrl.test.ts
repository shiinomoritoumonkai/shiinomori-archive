import { describe, expect, it } from 'vitest';
import { downloadUrl, openUrl, photoUrl } from './photoUrl.ts';

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
