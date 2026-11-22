// Drive の画像 URL を組み立てる唯一の場所（SPEC §3.4 の 6、付録 B）。
// URL の形は config/site.json の images にあり、M0 の実測で確定する。
import site from '../../config/site.json' with { type: 'json' };
import { placeholderSvg, seedOf } from '../../scripts/fixtures/placeholder.ts';
import type { PhotoRef } from '../../shared/types.ts';

export type PhotoSize = 'tile' | 'cover' | 'viewer';
export type PhotoVariant = 'primary' | 'fallback';

const images = site.images;

function isLocal(): boolean {
  // Node（取り込みスクリプト）では import.meta.env が無い
  return import.meta.env?.VITE_PHOTO_SOURCE === 'local';
}

function fill(template: string, ref: PhotoRef, w?: number): string {
  let url = template.replace('{id}', encodeURIComponent(ref.id));
  if (w !== undefined) url = url.replace('{w}', String(w));
  if (ref.rk) url += (url.includes('?') ? '&' : '?') + `resourcekey=${encodeURIComponent(ref.rk)}`;
  return url;
}

export function widthOf(size: PhotoSize): number {
  return images.widths[size];
}

/** 表示用の画像 URL。variant が fallback なら予備の URL */
export function photoUrl(ref: PhotoRef, size: PhotoSize, variant: PhotoVariant = 'primary'): string {
  const w = widthOf(size);
  if (isLocal()) {
    // フィクスチャ用：ID から仮画像をその場で作る（静的サイトでも動く）。1/40 は表示用 URL の失敗を模し、予備 URL は成功する
    const seed = seedOf(ref.id);
    if (variant === 'primary' && seed % 40 === 0) return 'data:image/svg+xml,broken';
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(placeholderSvg(ref.id, w, seed % 4 === 1))}`;
  }
  return fill(variant === 'primary' ? images.primary : images.fallback, ref, w);
}

/** 原寸のダウンロード */
export function downloadUrl(ref: PhotoRef): string {
  return fill(images.download, ref);
}

/** Drive で開く */
export function openUrl(ref: PhotoRef): string {
  return fill(images.open, ref);
}

/** CSP の img-src に書くホスト名 */
export const imageHosts: readonly string[] = images.hosts;
