// ビューア（SPEC §7.5）：全画面、前後の移動（← → とスワイプ）、Esc で閉じる、前後 1 枚ずつ先読み
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Photo } from '../../shared/types.ts';
import { loadImage, type LoadResult } from '../lib/imageQueue.ts';
import { downloadUrl, openUrl } from '../lib/photoUrl.ts';

export interface ViewerCaption {
  /** 例「1990年 夏合宿」「青鹿寮」 */
  title: string;
  /** 例「8月3日」 */
  date?: string;
  /** スポット名 */
  spot?: string;
  /** ファイルの説明 */
  note?: string;
}

interface Props {
  photos: Photo[];
  index: number;
  caption: (photo: Photo, index: number) => ViewerCaption;
  onIndex: (i: number) => void;
  onClose: () => void;
}

const LARGE_BYTES = 100 * 1024 * 1024;

function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

export function Viewer({ photos, index, caption, onIndex, onClose }: Props) {
  const photo = photos[index];
  const [loaded, setLoaded] = useState<LoadResult | undefined>();
  const [failed, setFailed] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const touch = useRef<{ x: number; y: number; id: number } | null>(null);

  const go = (d: number): void => {
    const next = index + d;
    if (next >= 0 && next < photos.length) onIndex(next);
  };

  useEffect(() => {
    if (!photo) return;
    setLoaded(undefined);
    setFailed(false);
    const h = loadImage(photo, 'viewer');
    h.promise.then(setLoaded, (e: Error) => {
      if (e.message !== 'cancelled') setFailed(true);
    });
    // 前後 1 枚ずつ先読み
    const pre = [photos[index - 1], photos[index + 1]].filter((p): p is Photo => !!p).map((p) => loadImage(p, 'viewer', () => 1));
    return () => {
      h.cancel();
      for (const p of pre) p.cancel();
    };
  }, [photo?.id]);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [index, photos.length]);

  if (!photo) return null;
  const cap = caption(photo, index);
  const large = (photo.bytes ?? 0) >= LARGE_BYTES;

  const onPointerDown = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse') return;
    touch.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onPointerUp = (e: PointerEvent): void => {
    const t = touch.current;
    touch.current = null;
    if (!t || t.id !== e.pointerId) return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  };

  return (
    <div class="viewer" role="dialog" aria-modal="true" aria-label={`写真 ${index + 1} / ${photos.length}`} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <div class="v-top">
        <span class="v-count">
          {index + 1} / {photos.length}
        </span>
        <button ref={closeBtn} type="button" class="v-close" onClick={onClose} aria-label="閉じる">
          閉じる
        </button>
      </div>
      <div class="v-stage">
        <button type="button" class="v-nav v-prev" onClick={() => go(-1)} disabled={index === 0} aria-label="前の写真">
          ←
        </button>
        <div class="v-img" style={{ aspectRatio: photo.w && photo.h ? `${photo.w} / ${photo.h}` : '4 / 3' }}>
          {loaded ? (
            <img src={loaded.url} alt={cap.note ?? cap.title} referrerpolicy="no-referrer" decoding="async" />
          ) : failed ? (
            <div class="v-failed">
              <p>写真を読み込めませんでした。</p>
              <a href={openUrl(photo)} target="_blank" rel="noopener noreferrer">
                Drive で開く
              </a>
            </div>
          ) : null}
        </div>
        <button type="button" class="v-nav v-next" onClick={() => go(1)} disabled={index === photos.length - 1} aria-label="次の写真">
          →
        </button>
      </div>
      <div class="v-cap">
        <p class="v-title">
          <strong>{cap.title}</strong>
          {cap.date ? <span class="v-sub">{cap.date}</span> : null}
          {cap.spot ? <span class="v-sub">{cap.spot}</span> : null}
        </p>
        {cap.note ? <p class="v-note">{cap.note}</p> : null}
        <p class="v-links">
          <a href={downloadUrl(photo)} target="_blank" rel="noopener noreferrer">
            原寸をダウンロード{photo.bytes ? `（${formatBytes(photo.bytes)}）` : ''}
          </a>
          <a href={openUrl(photo)} target="_blank" rel="noopener noreferrer">
            Drive で開く
          </a>
        </p>
        {large ? <p class="v-note">大きなファイルなので、Drive の確認画面が出ることがあります。その場合は画面の「ダウンロード」を押してください。</p> : null}
      </div>
    </div>
  );
}
