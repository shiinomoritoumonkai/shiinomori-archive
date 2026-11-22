// 写真 1 枚。枠を先に確保し、画面に近づいたらキューに入れる。失敗したら灰色の枠のまま。
import { useEffect, useRef, useState } from 'preact/hooks';
import type { PhotoRef } from '../../shared/types.ts';
import { loadImage, type Handle } from '../lib/imageQueue.ts';
import type { PhotoSize } from '../lib/photoUrl.ts';

interface Props {
  photo: PhotoRef;
  size: PhotoSize;
  alt: string;
  /** CSS の aspect-ratio（例 '5 / 4'）。省略時は写真の比率、不明なら 4 / 3 */
  aspect?: string;
  class?: string;
  /** 画面からこの距離（px）に入ったら読み始める */
  margin?: number;
  /** 即座に読む（ビューアなど） */
  eager?: boolean;
  onLoaded?: (r: { naturalWidth: number; naturalHeight: number }) => void;
  onFailed?: () => void;
}

export function PhotoImg({ photo, size, alt, aspect, class: cls, margin = 1200, eager = false, onLoaded, onFailed }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | undefined>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let handle: Handle | undefined;
    let io: IntersectionObserver | undefined;
    const priority = (): number => {
      const r = el.getBoundingClientRect();
      const vh = innerHeight || 800;
      if (r.bottom < 0) return -r.bottom;
      if (r.top > vh) return r.top - vh;
      return 0;
    };
    const start = (): void => {
      if (handle) return;
      handle = loadImage(photo, size, priority);
      handle.promise.then(
        (r) => {
          setUrl(r.url);
          onLoaded?.(r);
        },
        (e: Error) => {
          if (e.message === 'cancelled') return;
          setFailed(true);
          onFailed?.();
        },
      );
    };
    if (eager) start();
    else {
      io = new IntersectionObserver(
        (ents) => {
          for (const en of ents) if (en.isIntersecting) start();
        },
        { rootMargin: `${margin}px 0px` },
      );
      io.observe(el);
    }
    return () => {
      io?.disconnect();
      handle?.cancel();
    };
    // photo の id と size が変わったときだけ読み直す
  }, [photo.id, size, eager]);

  const ratio = aspect ?? (photo.w && photo.h ? `${photo.w} / ${photo.h}` : '4 / 3');
  return (
    <div ref={box} class={`ph${failed ? ' is-failed' : ''}${url ? ' is-loaded' : ''}${cls ? ` ${cls}` : ''}`} style={{ aspectRatio: ratio }}>
      {url ? <img src={url} alt={alt} referrerpolicy="no-referrer" decoding="async" /> : <span class="ph-alt">{failed ? alt : ''}</span>}
    </div>
  );
}
