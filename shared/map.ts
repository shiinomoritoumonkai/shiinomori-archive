// docs/SPEC.md §4.4：マップ用フォルダを読む
import { isImageFile, parseExifTime, dimensionsOf, WarningSink } from './archive.ts';
import { isHiddenName, normalizeName } from './names.ts';
import type { FolderNode } from './tree.ts';
import { SHORTCUT_MIME, type DriveFile, type Photo, type Spot, type SpotConfig, type Warning } from './types.ts';

export interface MapOptions {
  spots: SpotConfig[];
  photosPerSpot: number;
  imageMimeTypes: string[];
  imageExtensions: string[];
}

export interface MapResult {
  spots: Spot[];
  warnings: Warning[];
  excluded: Record<string, number>;
  photoCount: number;
}

interface MapPhoto {
  photo: Photo;
  sortTime: number;
}

function toMapPhoto(f: DriveFile): MapPhoto {
  const exif = parseExifTime(f.imageMediaMetadata?.time);
  const created = f.createdTime ? Date.parse(f.createdTime) : 0;
  const photo: Photo = { id: f.id, mime: f.mimeType, ...dimensionsOf(f) };
  if (f.resourceKey) photo.rk = f.resourceKey;
  if (f.size && Number(f.size) > 0) photo.bytes = Number(f.size);
  if (exif) {
    photo.month = exif.month;
    photo.day = exif.day;
  }
  const caption = f.description?.trim();
  if (caption) photo.caption = caption;
  return { photo, sortTime: exif ? exif.epoch : created };
}

export function walkMap(root: FolderNode, opts: MapOptions): MapResult {
  const warnings = new WarningSink();
  const excluded: Record<string, number> = {};
  const bySpot = new Map<string, MapPhoto[]>();
  let photoCount = 0;

  const collect = (node: FolderNode, spotId: string, path: string): void => {
    for (const f of node.files) {
      if (isHiddenName(f.name)) continue;
      if (f.mimeType === SHORTCUT_MIME) {
        warnings.add('SHORTCUT', path);
        continue;
      }
      if (!isImageFile(f, opts)) {
        excluded[f.mimeType] = (excluded[f.mimeType] ?? 0) + 1;
        continue;
      }
      const list = bySpot.get(spotId) ?? [];
      list.push(toMapPhoto(f));
      bySpot.set(spotId, list);
      photoCount++;
    }
    for (const c of node.folders) {
      if (isHiddenName(c.name)) continue;
      collect(c, spotId, `${path}/${normalizeName(c.name)}`);
    }
  };

  for (const f of root.files) {
    if (isHiddenName(f.name)) continue;
    warnings.add('FILE_AT_MAP_ROOT', '');
  }
  for (const c of root.folders) {
    if (isHiddenName(c.name)) continue;
    const n = normalizeName(c.name);
    const spot = opts.spots.find((s) => normalizeName(s.name) === n || s.aliases?.some((a) => normalizeName(a) === n));
    const path = `/${n}`;
    if (!spot) {
      warnings.add('UNKNOWN_SPOT', path);
      continue;
    }
    collect(c, spot.id, path);
  }

  const spots: Spot[] = opts.spots.map((s) => {
    const photos = (bySpot.get(s.id) ?? []).sort((a, b) => b.sortTime - a.sortTime).slice(0, opts.photosPerSpot);
    if (photos.length === 0) warnings.add('SPOT_WITHOUT_PHOTOS', `/${s.name}`);
    const spot: Spot = { id: s.id, name: s.name, category: s.category, x: s.x, y: s.y, description: s.description, photos: photos.map((p) => p.photo) };
    if (s.kana) spot.kana = s.kana;
    return spot;
  });

  return { spots, warnings: warnings.list, excluded, photoCount };
}
