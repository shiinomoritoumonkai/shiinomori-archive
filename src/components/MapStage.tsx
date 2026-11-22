// マップの土台（SPEC §7.2）：ドラッグ・ホイール・ピンチで移動と拡大、＋−と全体表示、ダブルタップで拡大。拡大してもピンの大きさは変えない。
import type { ComponentChildren, RefObject } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import mapConfig from '../../config/map.json' with { type: 'json' };
import type { Spot } from '../../shared/types.ts';

export interface StageHandle {
  /** スポットへ寄せる（右側パネル・下のシートの分だけ中心をずらす） */
  focus: (spot: Spot) => void;
  fit: () => void;
}

interface Props {
  spots: Spot[];
  activeId?: string | undefined;
  dimIds?: Set<string> | undefined;
  onPin: (id: string) => void;
  /** picker モード：画像上の座標（%）をクリックで返す */
  onPick?: ((x: number, y: number) => void) | undefined;
  handle?: RefObject<StageHandle | null> | undefined;
  children?: ComponentChildren;
}

const IMG_W = mapConfig.width;
const IMG_H = mapConfig.height;
const base = import.meta.env.BASE_URL;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const isMobile = (): boolean => matchMedia('(max-width: 767px)').matches;

export function MapStage({ spots, activeId, dimIds, onPin, onPick, handle, children }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const view = useRef({ s: 1, tx: 0, ty: 0 });
  const fitScale = useRef(1);
  const [ready, setReady] = useState(false);

  const apply = (): void => {
    const w = worldRef.current;
    if (!w) return;
    const { s, tx, ty } = view.current;
    w.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
    w.style.setProperty('--inv', (1 / s).toFixed(4));
  };
  const rect = (): DOMRect => stageRef.current!.getBoundingClientRect();
  const zoomAt = (f: number, cx: number, cy: number): void => {
    const v = view.current;
    const ns = clamp(v.s * f, fitScale.current * 0.7, fitScale.current * 8);
    const k = ns / v.s;
    v.tx = cx - (cx - v.tx) * k;
    v.ty = cy - (cy - v.ty) * k;
    v.s = ns;
    apply();
  };
  const fit = (): void => {
    const r = rect();
    if (!r.width) return;
    fitScale.current = Math.min(r.width / IMG_W, r.height / IMG_H);
    const mobile = isMobile();
    const s = fitScale.current * (mobile ? mapConfig.mobileInitialZoom : mapConfig.desktopInitialZoom);
    const cx = (mapConfig.initialCenter.x / 100) * IMG_W;
    const cy = (mapConfig.initialCenter.y / 100) * IMG_H;
    view.current = { s, tx: clampAxis(r.width / 2 - cx * s, r.width, IMG_W * s), ty: clampAxis(r.height / 2 - cy * s, r.height, IMG_H * s) };
    apply();
    setReady(true);
  };
  /** 画像が枠に収まるなら中央に、収まらないなら端に隙間が出ない範囲に */
  const clampAxis = (t: number, frame: number, size: number): number => (size <= frame ? (frame - size) / 2 : clamp(t, frame - size, 0));
  const focus = (spot: Spot): void => {
    const r = rect();
    const v = view.current;
    const s = Math.max(v.s, fitScale.current * 2.4);
    const px = (spot.x / 100) * IMG_W;
    const py = (spot.y / 100) * IMG_H;
    const mobile = isMobile();
    // PC は右側のパネル（440px）の分、スマホは下のシート（高さ 60%）の分だけ中心をずらす
    const offX = mobile ? 0 : -220;
    const offY = mobile ? -r.height * 0.25 : 0;
    view.current = { s, tx: r.width / 2 + offX - px * s, ty: r.height / 2 + offY - py * s };
    apply();
  };
  useEffect(() => {
    if (handle) handle.current = { focus, fit };
  });

  useEffect(() => {
    const stage = stageRef.current!;
    fit();
    const ro = new ResizeObserver(() => fit());
    ro.observe(stage);

    const pts = new Map<number, { x: number; y: number }>();
    let last: { x: number; y: number } | null = null;
    let pinchD = 0;
    let moved = 0;
    let lastTap = 0;
    const dist = (): number => {
      const a = [...pts.values()];
      return Math.hypot(a[0]!.x - a[1]!.x, a[0]!.y - a[1]!.y);
    };
    const mid = (): { x: number; y: number } => {
      const a = [...pts.values()];
      const r = rect();
      return { x: (a[0]!.x + a[1]!.x) / 2 - r.left, y: (a[0]!.y + a[1]!.y) / 2 - r.top };
    };
    const inUi = (e: Event): boolean => !!(e.target as Element).closest('.pin, .map-ctrl, .spot-panel, .detail, .picker');
    const onDown = (e: PointerEvent): void => {
      if (inUi(e)) return;
      stage.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0;
      if (pts.size === 1) last = { x: e.clientX, y: e.clientY };
      if (pts.size === 2) pinchD = dist();
      stage.classList.add('is-dragging');
    };
    const onMove = (e: PointerEvent): void => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1 && last) {
        const dx = e.clientX - last.x;
        const dy = e.clientY - last.y;
        moved += Math.abs(dx) + Math.abs(dy);
        view.current.tx += dx;
        view.current.ty += dy;
        last = { x: e.clientX, y: e.clientY };
        apply();
      } else if (pts.size === 2) {
        const d = dist();
        if (pinchD) {
          const m = mid();
          zoomAt(d / pinchD, m.x, m.y);
        }
        pinchD = d;
        moved += 10;
      }
    };
    const onUp = (e: PointerEvent): void => {
      const wasTap = pts.has(e.pointerId) && moved < 8;
      pts.delete(e.pointerId);
      last = null;
      pinchD = 0;
      if (!pts.size) stage.classList.remove('is-dragging');
      if (!wasTap) return;
      const r = rect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const now = Date.now();
      if (e.pointerType !== 'mouse' && now - lastTap < 300) {
        zoomAt(1.6, x, y);
        lastTap = 0;
        return;
      }
      lastTap = now;
      if (onPick) {
        const v = view.current;
        const px = ((x - v.tx) / v.s / IMG_W) * 100;
        const py = ((y - v.ty) / v.s / IMG_H) * 100;
        if (px >= 0 && px <= 100 && py >= 0 && py <= 100) onPick(Math.round(px * 10) / 10, Math.round(py * 10) / 10);
      }
    };
    const onWheel = (e: WheelEvent): void => {
      if (inUi(e)) return;
      e.preventDefault();
      const r = rect();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
    };
    const onDbl = (e: MouseEvent): void => {
      if (inUi(e)) return;
      const r = rect();
      zoomAt(1.6, e.clientX - r.left, e.clientY - r.top);
    };
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);
    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('dblclick', onDbl);
    return () => {
      ro.disconnect();
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onUp);
      stage.removeEventListener('wheel', onWheel);
      stage.removeEventListener('dblclick', onDbl);
    };
  }, []);

  return (
    <div class={`map-stage${ready ? ' is-ready' : ''}${onPick ? ' is-picker' : ''}`} ref={stageRef}>
      <div class="map-world" ref={worldRef} style={{ width: `${IMG_W}px`, height: `${IMG_H}px` }}>
        <img class="map-img" src={`${base}${mapConfig.image}`} width={IMG_W} height={IMG_H} alt="田野畑村のマップ" draggable={false} />
        <div class="pins">
          {spots.map((s) => (
            <button
              type="button"
              key={s.id}
              class={`pin${activeId === s.id ? ' is-active' : ''}${dimIds?.has(s.id) ? ' is-dim' : ''}`}
              style={{ left: `${s.x}%`, top: `${s.y}%`, zIndex: activeId === s.id ? 10000 : Math.round(s.y * 10) }}
              onClick={() => onPin(s.id)}
              aria-label={s.name}
              aria-pressed={activeId === s.id}
            >
              <svg viewBox="0 0 30 38" aria-hidden="true">
                <path d="M15 1C7.3 1 1 7.2 1 14.8c0 9.7 12.6 21.6 13.1 22.1a1.3 1.3 0 0 0 1.8 0C16.4 36.4 29 24.5 29 14.8 29 7.2 22.7 1 15 1z" />
                <circle cx="15" cy="14.5" r="5.2" fill="#fff" />
              </svg>
              <span class="pin-label">{s.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div class="map-ctrl" role="group" aria-label="地図の拡大と縮小">
        <button type="button" onClick={() => zoomAt(1.4, rect().width / 2, rect().height / 2)} aria-label="拡大">
          ＋
        </button>
        <button type="button" onClick={() => zoomAt(1 / 1.4, rect().width / 2, rect().height / 2)} aria-label="縮小">
          −
        </button>
        <button type="button" onClick={fit} aria-label="全体を表示">
          全体
        </button>
      </div>
      {children}
    </div>
  );
}
