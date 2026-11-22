// マップ（SPEC §7.2）
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import spotCategories from '../../config/spot-categories.json' with { type: 'json' };
import type { Photo, Spot } from '../../shared/types.ts';
import { MapStage, type StageHandle } from '../components/MapStage.tsx';
import { PhotoImg } from '../components/PhotoImg.tsx';
import { Viewer } from '../components/Viewer.tsx';
import { getSpots } from '../lib/data.ts';
import { navigate, type Route } from '../lib/router.ts';
import { closeViewer, openViewer, setViewerIndex, viewerIndex } from '../lib/viewerRoute.ts';

const CATS = spotCategories as Record<string, string>;
const catName = (c: string): string => CATS[c] ?? c;

function withSpot(route: Route, id: string | undefined): string {
  const params = new URLSearchParams(route.params);
  params.delete('p');
  if (id) params.set('spot', id);
  else params.delete('spot');
  const q = params.toString();
  return `${route.path}${q ? `?${q}` : ''}`;
}

export function MapPage({ cryptoKey, route }: { cryptoKey: CryptoKey; route: Route }) {
  const [spots, setSpots] = useState<Spot[] | undefined>();
  const [error, setError] = useState('');
  const [cat, setCat] = useState('all');
  const [listOpen, setListOpen] = useState(false);
  const [pick, setPick] = useState<{ x: number; y: number } | undefined>();
  const stage = useRef<StageHandle>(null);
  const picker = route.params.get('picker') === '1';
  const activeId = route.params.get('spot') ?? undefined;
  const vIndex = viewerIndex(route);

  useEffect(() => {
    getSpots(cryptoKey).then((d) => setSpots(d.spots), () => setError('マップのデータを読み込めませんでした。再読み込みしてください'));
  }, [cryptoKey]);

  const active = useMemo(() => spots?.find((s) => s.id === activeId), [spots, activeId]);
  const dimIds = useMemo(() => new Set((spots ?? []).filter((s) => cat !== 'all' && s.category !== cat).map((s) => s.id)), [spots, cat]);
  const listed = useMemo(() => (spots ?? []).filter((s) => cat === 'all' || s.category === cat), [spots, cat]);
  const categories = useMemo(() => Object.keys(CATS).filter((c) => (spots ?? []).some((s) => s.category === c)), [spots]);

  // スポットが選ばれたら、その場所へ寄せる
  useEffect(() => {
    if (active && stage.current) stage.current.focus(active);
  }, [active?.id]);

  const open = (id: string): void => {
    navigate(withSpot(route, id), { replace: !!activeId });
    setListOpen(false);
  };
  const close = (): void => navigate(withSpot(route, undefined), { replace: true });

  if (error) return <main class="page-plain"><p>{error}</p></main>;

  const photos: Photo[] = active?.photos ?? [];
  return (
    <main class="map-page" aria-busy={!spots}>
      <MapStage
        spots={spots ?? []}
        activeId={activeId}
        dimIds={dimIds}
        onPin={open}
        handle={stage}
        onPick={picker ? (x, y) => setPick({ x, y }) : undefined}
      >
        {/* スポット一覧：PC は左のパネル、スマホは下部のシート */}
        <aside class={`spot-panel${listOpen ? ' is-open' : ''}`} aria-label="スポット一覧">
          <button type="button" class="sp-head" onClick={() => setListOpen((v) => !v)} aria-expanded={listOpen}>
            <span class="sp-title">スポット一覧</span>
            <span class="muted">{listed.length}か所</span>
          </button>
          <div class="sp-body">
            <div class="chips" role="group" aria-label="カテゴリで絞り込む">
              <button type="button" class={`chip${cat === 'all' ? ' is-active' : ''}`} onClick={() => setCat('all')} aria-pressed={cat === 'all'}>
                すべて
              </button>
              {categories.map((c) => (
                <button type="button" key={c} class={`chip${cat === c ? ' is-active' : ''}`} onClick={() => setCat(c)} aria-pressed={cat === c}>
                  {catName(c)}
                </button>
              ))}
            </div>
            <ul class="spot-list">
              {listed.map((s) => (
                <li key={s.id}>
                  <button type="button" class={activeId === s.id ? 'is-active' : ''} onClick={() => open(s.id)} aria-current={activeId === s.id ? 'true' : undefined}>
                    <span class="sl-name">{s.name}</span>
                    <span class="sl-sub muted">
                      {catName(s.category)}
                      {s.photos.length ? `　${s.photos.length}枚` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* 詳細：PC は右のパネル、スマホは下からのシート */}
        {active ? (
          <aside class="detail" aria-label={active.name}>
            <div class="d-head">
              <button type="button" class="d-close" onClick={close}>
                閉じる
              </button>
            </div>
            <div class="d-body">
              <span class="cat-tag">{catName(active.category)}</span>
              <h2 class="d-title">{active.name}</h2>
              {active.kana ? <p class="d-kana muted">{active.kana}</p> : null}
              <p class="d-desc">{active.description}</p>
              {photos.length ? (
                <div class="d-grid">
                  {photos.map((p, i) => (
                    <button type="button" key={p.id} class="tile-btn" onClick={() => openViewer(route, i)} aria-label={p.caption ?? `${active.name}の写真 ${i + 1}`}>
                      <PhotoImg photo={p} size="tile" alt="" aspect="4 / 3" class="tile" margin={400} />
                    </button>
                  ))}
                </div>
              ) : (
                <p class="muted">この場所の写真はまだありません。</p>
              )}
            </div>
          </aside>
        ) : null}

        {picker ? (
          <div class="picker" role="status">
            <p>
              <strong>座標ピッカー</strong>：地図をクリックすると、その位置の x・y（%）を表示します。
            </p>
            {pick ? (
              <>
                <p>
                  x: {pick.x}　y: {pick.y}
                </p>
                <pre class="picker-code">{`{ "id": "", "name": "", "category": "", "x": ${pick.x}, "y": ${pick.y}, "description": "" }`}</pre>
                <button
                  type="button"
                  class="btn"
                  onClick={() => navigator.clipboard?.writeText(`{ "id": "", "name": "", "category": "", "x": ${pick.x}, "y": ${pick.y}, "description": "" }`)}
                >
                  コピー
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </MapStage>

      {active && vIndex !== undefined && photos[vIndex] ? (
        <Viewer
          photos={photos}
          index={vIndex}
          caption={(p) => ({ title: active.name, ...(p.month && p.day ? { date: `${p.month}月${p.day}日` } : {}), ...(p.caption ? { note: p.caption } : {}) })}
          onIndex={(i) => setViewerIndex(route, i)}
          onClose={() => closeViewer(route)}
        />
      ) : null}
    </main>
  );
}
