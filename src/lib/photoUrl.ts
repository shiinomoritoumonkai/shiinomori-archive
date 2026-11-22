// Drive の画像 URL を組み立てる唯一の場所（SPEC §3.4 の 6、付録 B）。
// URL の形は config/site.json の images にあり、M0 の実測で確定する。
import site from '../../config/site.json' with { type: 'json' };
import type { PhotoRef } from '../../shared/types.ts';

export type PhotoSize = 'tile' | 'cover' | 'viewer';
export type PhotoVariant = 'primary' | 'fallback';

const images = site.images;

function isLocal(): boolean {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return env?.VITE_PHOTO_SOURCE === 'local';
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
    const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
    return `${base}fixture-img/${encodeURIComponent(ref.id)}.svg?w=${w}&v=${variant}`;
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
