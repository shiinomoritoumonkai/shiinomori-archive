import { beforeEach, describe, expect, it } from 'vitest';
import siteConfig from '../config/site.json' with { type: 'json' };
import { walkMap, type MapOptions } from './map.ts';
import { file, folder, photos, resetIds } from './testTree.ts';

const opts: MapOptions = {
  spots: [
    { id: 'seiroku', name: '青鹿寮', aliases: ['青鹿'], category: 'dorm', x: 1, y: 2, description: '寮' },
    { id: 'omarupe', name: 'オマルペ山', category: 'forest', x: 3, y: 4, description: '山' },
  ],
  photosPerSpot: 3,
  imageMimeTypes: siteConfig.imageMimeTypes,
  imageExtensions: siteConfig.imageExtensions,
};

beforeEach(() => resetIds());

describe('walkMap（SPEC §4.4）', () => {
  it('スポットごとに新しい順で最大 N 枚、サブフォルダも同じスポット', () => {
    const tree = folder('マップ', [
      file(),
      folder('青鹿', [
        file({ time: '2024:08:01 10:00:00' }),
        file({ time: '2025:08:01 10:00:00' }),
        folder('夜', [file({ time: '2023:08:01 10:00:00' }), file({ time: '2026:08:01 10:00:00' })]),
        file({ mime: 'video/mp4', name: 'v.mp4' }),
      ]),
      folder('知らない場所', photos(2)),
      folder('_下書き', photos(2)),
    ]);
    const r = walkMap(tree, opts);
    const seiroku = r.spots.find((s) => s.id === 'seiroku')!;
    expect(seiroku.photos.length).toBe(3);
    expect(seiroku.photos.map((p) => p.month)).toEqual([8, 8, 8]);
    expect(seiroku.photos[0]!.id).toBe(tree.folders[0]!.folders[0]!.files[1]!.id);
    expect(r.spots.find((s) => s.id === 'omarupe')!.photos).toEqual([]);
    expect(r.excluded).toEqual({ 'video/mp4': 1 });
    expect(r.warnings).toEqual([
      { code: 'FILE_AT_MAP_ROOT', path: '', count: 1 },
      { code: 'UNKNOWN_SPOT', path: '/知らない場所', count: 1 },
      { code: 'SPOT_WITHOUT_PHOTOS', path: '/オマルペ山', count: 1 },
    ]);
    expect(r.photoCount).toBe(4);
  });
});
