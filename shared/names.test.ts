import { describe, expect, it } from 'vitest';
import { isCoverName, looksLikeCopy, normalizeName, parseFolderName } from './names.ts';

const range = { min: 1950, max: 2027 };

describe('parseFolderName（SPEC §4.3 の表）', () => {
  const cases: [string, string | undefined, string | undefined, boolean?][] = [
    ['1990年', '1990', undefined],
    ['1990年_夏合宿', '1990', '夏合宿'],
    ['１９９０年＿夏合宿', '1990', '夏合宿'],
    ['1990年夏合宿', '1990', '夏合宿'],
    ['1990_夏合宿', '1990', '夏合宿'],
    ['1990-夏合宿', '1990', '夏合宿'],
    ['1990 夏合宿', '1990', '夏合宿'],
    ['1990', '1990', undefined],
    ['1990年度_春合宿', '1990', '春合宿'],
    ['1990年_夏合宿_その2', '1990', '夏合宿_その2'],
    ['1990年_50周年記念式典', '1990', '50周年記念式典'],
    ['1988夏', '1988', '夏'],
    ['1990夏合宿', '1990', '夏合宿'],
    ['1970年代', '1970s', undefined],
    ['1970年代_夏合宿', '1970s', '夏合宿'],
    ['1970年代_年不明', '1970s', undefined],
    ['年不明', 'unknown', undefined],
    ['年代不明', 'unknown', undefined],
    ['年不明_集合写真', 'unknown', '集合写真'],
    ['夏合宿', undefined, undefined],
    ['1975年代', undefined, undefined, true],
    ['3020年_未来', undefined, undefined, true],
    ['1949年_前史', undefined, undefined, true],
  ];
  for (const [name, yearKey, event, bad] of cases) {
    it(name, () => {
      const p = parseFolderName(name, range);
      expect(p.yearKey).toBe(yearKey);
      expect(p.event).toBe(event);
      expect(p.badYear).toBe(bad ?? false);
    });
  }
  it('5 桁の数字は年として読まない', () => {
    expect(parseFolderName('19901_x', range).badYear).toBe(true);
  });
});

describe('normalizeName', () => {
  it('NFD の濁点を NFC にまとめ、空白を整える', () => {
    const nfd = '1990年_プレイパーク'.normalize('NFD');
    expect(normalizeName(nfd)).toBe('1990年_プレイパーク');
    expect(normalizeName('  1990年   夏合宿 ')).toBe('1990年 夏合宿');
  });
});

describe('looksLikeCopy / isCoverName', () => {
  it('のコピー、(1)、copy', () => {
    expect(looksLikeCopy('1990年_夏合宿 のコピー')).toBe(true);
    expect(looksLikeCopy('1990年_夏合宿 (1)')).toBe(true);
    expect(looksLikeCopy('1990年_夏合宿（2）')).toBe(true);
    expect(looksLikeCopy('1990年_夏合宿 copy')).toBe(true);
    expect(looksLikeCopy('1990年_夏合宿')).toBe(false);
  });
  it('表紙で始まる名前', () => {
    expect(isCoverName('表紙.jpg')).toBe(true);
    expect(isCoverName('表紙_集合写真.jpg')).toBe(true);
    expect(isCoverName('裏表紙.jpg')).toBe(false);
  });
});
