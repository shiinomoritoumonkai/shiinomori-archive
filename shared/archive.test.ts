import { beforeEach, describe, expect, it } from 'vitest';
import eventsConfig from '../config/events.json' with { type: 'json' };
import siteConfig from '../config/site.json' with { type: 'json' };
import { chooseCover, finalizeYear, orderYearKeys, sortPhotos, walkArchive, type ArchiveOptions, type IngestPhoto } from './archive.ts';
import { categorize } from './categorize.ts';
import { file, folder, landscape, nodims, photos, portrait, resetIds } from './testTree.ts';
import type { Warning, YearKey } from './types.ts';

const opts: ArchiveOptions = {
  events: eventsConfig,
  spots: [{ id: 'omarupe', name: 'オマルペ山', category: 'forest', x: 0, y: 0, description: '' }],
  yearRange: { min: 1950, max: 2027 },
  imageMimeTypes: siteConfig.imageMimeTypes,
  imageExtensions: siteConfig.imageExtensions,
};

beforeEach(() => resetIds());

/** SPEC §4.3 のツリー */
function specTree() {
  return folder('アーカイブ', [
    file(),
    file({ shortcut: true }),
    folder('1968年', [folder('1968年_夏合宿', photos(3)), folder('1968年_秋合宿', photos(2))]),
    folder('1990年', [
      file(),
      file({ mime: 'video/mp4', name: 'movie.mp4' }),
      folder('1990年_春合宿', photos(2)),
      folder('1990年_夏合宿', [...photos(3), folder('オマルペ山', photos(2)), folder('1日目', photos(1))]),
      folder('１９９０年＿夏合宿', photos(1)),
      folder('夏合宿', photos(1)),
      folder('1990年_菅窪祭り', photos(2)),
      folder('1990年_早稲田祭', photos(1)),
      folder('1991年_秋合宿', photos(1)),
    ]),
    folder('2019_夏合宿', photos(2)),
    folder('2024年夏合宿', photos(1)),
    folder('1970年代', [file(), folder('1970年代_夏合宿', photos(2)), folder('1975年', [folder('1975年_秋合宿', photos(1))])]),
    folder('年不明', photos(2)),
    folder('スキャン分', [folder('1982年', [folder('1982年_夏合宿', photos(1))])]),
    folder('集合写真', photos(2)),
    folder('_作業中', photos(5)),
    folder('1990年_夏合宿 のコピー', photos(1)),
    folder('3020年_未来', photos(1)),
  ]);
}

function summarize(result: ReturnType<typeof walkArchive>) {
  const rows: [YearKey, string, string, number][] = [];
  for (const y of result.years.values()) {
    const fy = finalizeYear(y, eventsConfig);
    for (const e of fy.data.events) rows.push([y.yearKey, e.category, e.label || '—', e.photos.length]);
  }
  return rows;
}

describe('walkArchive（SPEC §4.3 のツリー）', () => {
  it('年ごとのイベントと枚数が表と一致する', () => {
    const r = walkArchive(specTree(), opts);
    const rows = summarize(r);
    const expected: [YearKey, string, string, number][] = [
      ['1968', '夏合宿', '夏合宿', 3],
      ['1968', '秋合宿', '秋合宿', 2],
      ['1975', '秋合宿', '秋合宿', 1],
      ['1970s', '夏合宿', '夏合宿', 2],
      ['1970s', 'その他', '—', 1],
      ['1982', '夏合宿', '夏合宿', 1],
      ['1990', '春合宿', '春合宿', 2],
      ['1990', '夏合宿', '夏合宿', 8],
      ['1990', '夏合宿', '夏合宿 のコピー', 1],
      ['1990', 'お祭り', '菅窪祭り', 2],
      ['1990', 'その他', '—', 1],
      ['1990', 'その他', '早稲田祭', 1],
      ['1991', '秋合宿', '秋合宿', 1],
      ['2019', '夏合宿', '夏合宿', 2],
      ['2024', '夏合宿', '夏合宿', 1],
      ['unknown', 'その他', '—', 2],
    ];
    const key = (x: (typeof rows)[number]) => x.join('|');
    expect(rows.map(key).sort()).toEqual(expected.map(key).sort());
    expect(r.photoCount).toBe(31);
    expect(r.excluded).toEqual({ 'video/mp4': 1 });
  });

  it('1990年 夏合宿 の内訳：オマルペ山の 2 枚に spot が付く', () => {
    const r = walkArchive(specTree(), opts);
    const y = r.years.get('1990')!;
    const e = y.events.get('夏合宿')!;
    expect(e.photos.length).toBe(8);
    expect(e.photos.filter((p) => p.photo.spot === 'omarupe').length).toBe(2);
  });

  it('警告が表と一致する', () => {
    const r = walkArchive(specTree(), opts);
    const expected: Warning[] = [
      { code: 'YEAR_MISMATCH', path: '/1990年/1991年_秋合宿', count: 1 },
      { code: 'NO_EVENT_FOLDER', path: '/1990年', count: 1 },
      { code: 'NO_YEAR', path: '/集合写真', count: 2 },
      { code: 'LOOKS_LIKE_COPY', path: '/1990年_夏合宿 のコピー', count: 1 },
      { code: 'BAD_YEAR_NAME', path: '/3020年_未来', count: 1 },
      { code: 'NO_YEAR', path: '/3020年_未来', count: 1 },
      { code: 'NO_YEAR', path: '', count: 1 },
      { code: 'SHORTCUT', path: '', count: 1 },
    ];
    const key = (w: Warning) => `${w.code}|${w.path}|${w.count}`;
    expect(r.warnings.map(key).sort()).toEqual(expected.map(key).sort());
  });

  it('NFD と NFC の同名フォルダが 1 つのイベントにまとまる', () => {
    const nfd = '1990年_プレイパーク'.normalize('NFD');
    const tree = folder('root', [folder('1990年', [folder(nfd, photos(1)), folder('1990年_プレイパーク', photos(2))])]);
    const r = walkArchive(tree, opts);
    const y = r.years.get('1990')!;
    expect([...y.events.keys()]).toEqual(['プレイパーク']);
    expect(y.events.get('プレイパーク')!.photos.length).toBe(3);
  });

  it('年フォルダとイベントフォルダの説明を取り込む', () => {
    const tree = folder('root', [folder('1990年', [folder('1990年_夏合宿', photos(1), '雨の合宿')], '創立 25 年')]);
    const r = walkArchive(tree, opts);
    const fy = finalizeYear(r.years.get('1990')!, eventsConfig);
    expect(fy.data.note).toBe('創立 25 年');
    expect(fy.data.events[0]!.description).toBe('雨の合宿');
  });

  it('同一写真（md5）はイベント内で 1 枚にまとめ、表紙の名前を残す', () => {
    const tree = folder('root', [folder('1990年_夏合宿', [file({ md5: 'a', name: 'IMG_1.jpg' }), file({ md5: 'a', name: '表紙.jpg' }), file({ md5: 'b' })])]);
    const r = walkArchive(tree, opts);
    const e = r.years.get('1990')!.events.get('夏合宿')!;
    expect(e.photos.length).toBe(2);
    expect(e.photos.some((p) => p.isCover)).toBe(true);
    expect(r.photoCount).toBe(2);
    expect(r.warnings).toEqual([{ code: 'DUPLICATE', path: '/1990年_夏合宿', count: 1 }]);
  });

  it('ファイル名はデータに含めない。キャプションは説明欄から', () => {
    const tree = folder('root', [folder('1990年_夏合宿', [file({ name: '山田太郎.jpg', description: '作業の様子' })])]);
    const r = walkArchive(tree, opts);
    const fy = finalizeYear(r.years.get('1990')!, eventsConfig);
    const json = JSON.stringify(fy.data);
    expect(json).not.toContain('山田太郎');
    expect(fy.data.events[0]!.photos[0]!.caption).toBe('作業の様子');
  });

  it('撮影日時は年が一致するときだけ採用する', () => {
    const tree = folder('root', [folder('1990年_夏合宿', [file({ time: '1990:08:03 10:00:00' }), file({ time: '2015:03:01 10:00:00' })])]);
    const r = walkArchive(tree, opts);
    const ps = r.years.get('1990')!.events.get('夏合宿')!.photos;
    expect(ps[0]!.photo.month).toBe(8);
    expect(ps[0]!.photo.day).toBe(3);
    expect(ps[1]!.photo.month).toBeUndefined();
    expect(ps[1]!.time).toBeUndefined();
  });

  it('イベントの中の年付きイベントは内側を採って警告する', () => {
    const tree = folder('root', [folder('1990年_夏合宿', [folder('1990年_秋合宿', photos(1))])]);
    const r = walkArchive(tree, opts);
    expect([...r.years.get('1990')!.events.keys()].filter((k) => r.years.get('1990')!.events.get(k)!.photos.length > 0)).toEqual(['秋合宿']);
    expect(r.warnings).toEqual([{ code: 'NESTED_EVENT', path: '/1990年_夏合宿/1990年_秋合宿', count: 1 }]);
  });
});

describe('dimensionsOf（rotation が奇数なら幅と高さを入れ替える。M0 の実測）', () => {
  it('rotation 1・3 は入れ替え、0・2 はそのまま、なしもそのまま', () => {
    const tree = folder('root', [
      folder('1990年_夏合宿', [
        file({ name: 'r0.jpg', w: 4000, h: 3000, rotation: 0 }),
        file({ name: 'r1.jpg', w: 4000, h: 3000, rotation: 1 }),
        file({ name: 'r2.jpg', w: 4000, h: 3000, rotation: 2 }),
        file({ name: 'r3.jpg', w: 4000, h: 3000, rotation: 3 }),
        file({ name: 'rn.jpg', w: 4000, h: 3000 }),
      ]),
    ]);
    const r = walkArchive(tree, opts);
    const ps = r.years.get('1990')!.events.get('夏合宿')!.photos;
    const dims = Object.fromEntries(ps.map((p) => [p.name, [p.photo.w, p.photo.h]]));
    expect(dims).toEqual({ 'r0.jpg': [4000, 3000], 'r1.jpg': [3000, 4000], 'r2.jpg': [4000, 3000], 'r3.jpg': [3000, 4000], 'rn.jpg': [4000, 3000] });
  });
});

describe('categorize', () => {
  it('規則を上から順に当てる', () => {
    expect(categorize('夏合宿', eventsConfig)).toBe('夏合宿');
    expect(categorize('早稲田祭', eventsConfig)).toBe('その他');
    expect(categorize('菅窪祭り', eventsConfig)).toBe('お祭り');
    expect(categorize('稲門祭', eventsConfig)).toBe('その他');
    expect(categorize('50周年記念式典', eventsConfig)).toBe('その他');
    expect(categorize('', eventsConfig)).toBe('その他');
    expect(categorize('夏', eventsConfig)).toBe('夏合宿');
    expect(categorize('1988秋', eventsConfig)).toBe('秋合宿');
    expect(categorize('夏祭り', eventsConfig)).toBe('お祭り');
  });
});

function ip(f: ReturnType<typeof file>, folderPath = '/1990年_夏合宿'): IngestPhoto {
  const w = f.imageMediaMetadata?.width;
  const h = f.imageMediaMetadata?.height;
  return {
    photo: { id: f.id, mime: f.mimeType, ...(w ? { w } : {}), ...(h ? { h } : {}) },
    name: f.name,
    isCover: f.name.startsWith('表紙'),
    folderPath,
  };
}

describe('chooseCover（SPEC §4.3 の表）', () => {
  const pick = (list: ReturnType<typeof file>[]) => {
    const ordered = list.map((f) => ip(f));
    const c = chooseCover(ordered);
    return { index: ordered.findIndex((p) => p.photo.id === c.cover?.id) + 1, extra: c.extraCoverPaths.length, mode: c.mode };
  };
  it('縦、横、横 → 2 枚目', () => expect(pick([portrait(), landscape(), landscape()])).toMatchObject({ index: 2, mode: 'auto' }));
  it('縦、縦 → 1 枚目', () => expect(pick([portrait(), portrait()])).toMatchObject({ index: 1, mode: 'auto' }));
  it('横、表紙.jpg（縦）、横 → 2 枚目', () => expect(pick([landscape(), portrait({ name: '表紙.jpg' }), landscape()])).toMatchObject({ index: 2, mode: 'named' }));
  it('横、表紙_a、表紙_b → 2 枚目と MULTIPLE_COVERS', () =>
    expect(pick([landscape(), landscape({ name: '表紙_a.jpg' }), landscape({ name: '表紙_b.jpg' })])).toMatchObject({ index: 2, extra: 1, mode: 'named' }));
  it('寸法不明、横 → 2 枚目', () => expect(pick([nodims(), landscape()])).toMatchObject({ index: 2 }));
  it('寸法不明、縦 → 1 枚目', () => expect(pick([nodims(), portrait()])).toMatchObject({ index: 1 }));
  it('裏表紙.jpg（横）、横 → 1 枚目', () => expect(pick([landscape({ name: '裏表紙.jpg' }), landscape()])).toMatchObject({ index: 1, mode: 'auto' }));
});

describe('表示順（SPEC §4.3 の例）', () => {
  it('春合宿 1 枚 → 夏合宿 4 枚（日時つき縦・横、日時なし IMG_2・IMG_10）で、表紙は夏合宿の 2 枚目', () => {
    const tree = folder('root', [
      folder('1990年', [
        folder('1990年_夏合宿', [
          file({ name: 'IMG_10.jpg' }),
          file({ name: 'IMG_2.jpg' }),
          landscape({ name: 'b.jpg', time: '1990:08:02 09:00:00' }),
          portrait({ name: 'a.jpg', time: '1990:08:01 09:00:00' }),
        ]),
        folder('1990年_菅窪祭り', photos(1)),
        folder('1990年_春合宿', [portrait()]),
        folder('1990年_早稲田祭', photos(1)),
      ]),
    ]);
    const r = walkArchive(tree, opts);
    const fy = finalizeYear(r.years.get('1990')!, eventsConfig);
    expect(fy.data.events.map((e) => e.label)).toEqual(['春合宿', '夏合宿', '菅窪祭り', '早稲田祭']);
    const summer = fy.data.events[1]!;
    const names = r.years.get('1990')!.events.get('夏合宿')!.photos;
    const sorted = sortPhotos(names).map((p) => p.name);
    expect(sorted).toEqual(['a.jpg', 'b.jpg', 'IMG_2.jpg', 'IMG_10.jpg']);
    expect(fy.cover.cover?.id).toBe(summer.photos[1]!.id);
    expect(fy.count).toBe(7);
  });
});

describe('orderYearKeys', () => {
  it('年代は最後の年のあと、年代不明はいちばん下、欠けなく並ぶ', () => {
    const out = orderYearKeys({ keys: ['1968', '1990', '1970s', 'unknown', '1975'], thisYear: 1992 });
    expect(out).toEqual([
      '1968', '1969', '1970', '1971', '1972', '1973', '1974', '1975', '1976', '1977', '1978', '1979', '1970s',
      '1980', '1981', '1982', '1983', '1984', '1985', '1986', '1987', '1988', '1989', '1990', '1991', '1992', 'unknown',
    ]);
  });
  it('今年まで伸ばす。年代だけの年もある', () => {
    expect(orderYearKeys({ keys: ['2024'], thisYear: 2026 })).toEqual(['2024', '2025', '2026']);
    expect(orderYearKeys({ keys: ['1960s'], thisYear: 1970 })).toEqual(['1969', '1960s', '1970']);
  });
});
