// 年のページ（SPEC §7.4）
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import spotsConfig from '../../config/spots.json' with { type: 'json' };
import type { Index, Photo, YearData } from '../../shared/types.ts';
import { yearLabel } from '../../shared/wareki.ts';
import { PhotoImg } from '../components/PhotoImg.tsx';
import { Viewer } from '../components/Viewer.tsx';
import { getIndex, getYear } from '../lib/data.ts';
import { href, navigate, type Route } from '../lib/router.ts';
import { closeViewer, openViewer, setViewerIndex, viewerIndex } from '../lib/viewerRoute.ts';

const CHUNK = 60;
const spotName = new Map(spotsConfig.map((s) => [s.id, s.name]));

interface Flat {
  photo: Photo;
  eventIndex: number;
  /** その年の表示順での通し番号 */
  n: number;
}

export function YearPage({ cryptoKey, route, yearKey }: { cryptoKey: CryptoKey; route: Route; yearKey: string }) {
  const [data, setData] = useState<YearData | undefined>();
  const [index, setIndex] = useState<Index | undefined>();
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(CHUNK);
  const [nowEvent, setNowEvent] = useState(0);
  const sentinel = useRef<HTMLDivElement>(null);
  const sections = useRef<HTMLDivElement>(null);
  const vIndex = viewerIndex(route);

  useEffect(() => {
    setData(undefined);
    setLimit(CHUNK);
    setNowEvent(0);
    getYear(cryptoKey, yearKey).then(setData, () => setError('この年のデータを読み込めませんでした。年表に戻ってやり直してください'));
    getIndex(cryptoKey).then(setIndex, () => {});
    scrollTo(0, 0);
  }, [cryptoKey, yearKey]);

  const label = yearLabel(yearKey);
  const flat = useMemo((): Flat[] => {
    const out: Flat[] = [];
    data?.events.forEach((e, ei) => e.photos.forEach((p) => out.push({ photo: p, eventIndex: ei, n: out.length })));
    return out;
  }, [data]);

  // 60 枚ずつ、スクロールに合わせて描画する
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !data) return;
    const io = new IntersectionObserver(
      (ents) => {
        if (ents.some((e) => e.isIntersecting)) setLimit((l) => Math.min(flat.length, l + CHUNK));
      },
      { rootMargin: '1600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [data, flat.length]);

  // 描画したあとも監視点がまだ近ければ、続けて次の 60 枚を描画する（スクロールが止まっていても埋まるように）
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !data || limit >= flat.length) return;
    const id = requestAnimationFrame(() => {
      if (el.getBoundingClientRect().top < innerHeight + 1600) setLimit((l) => Math.min(flat.length, l + CHUNK));
    });
    return () => cancelAnimationFrame(id);
  }, [limit, data, flat.length]);

  // ビューアで先のほうの写真を開いたときは、そこまで描画しておく
  useEffect(() => {
    if (vIndex !== undefined && vIndex >= limit) setLimit(Math.min(flat.length, Math.ceil((vIndex + 1) / CHUNK) * CHUNK));
  }, [vIndex]);

  // いま見ているイベント
  useEffect(() => {
    const root = sections.current;
    if (!root || !data) return;
    const io = new IntersectionObserver(
      (ents) => {
        for (const en of ents) if (en.isIntersecting) setNowEvent(Number((en.target as HTMLElement).dataset.ev));
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );
    for (const s of root.querySelectorAll<HTMLElement>('section[data-ev]')) io.observe(s);
    return () => io.disconnect();
  }, [data, limit]);

  const neighbors = useMemo(() => {
    if (!index) return { prev: undefined, next: undefined };
    const linked = index.years.filter((y) => y.count > 0 || y.hasNote).map((y) => y.yearKey);
    const i = linked.indexOf(yearKey);
    return { prev: i > 0 ? linked[i - 1] : undefined, next: i >= 0 && i < linked.length - 1 ? linked[i + 1] : undefined };
  }, [index, yearKey]);

  if (error) return <main class="page-plain"><p>{error}</p></main>;
  if (!data) return <main class="page-plain" aria-busy="true"><p>読み込んでいます…</p></main>;

  const events = data.events;
  const heading = (i: number): string => events[i]?.label || events[i]?.category || '';
  const yearText = label.long ? label.big : `${label.big}年`;
  let drawn = 0;

  return (
    <main class="year">
      <a class="back" href={href('/timeline')}>
        ← 年表
      </a>
      <p class="wa">{label.small}</p>
      <h1 class="yh">{label.big}</h1>
      {data.note ? <p class="note">{data.note}</p> : null}
      {events.length >= 2 ? (
        <nav class="evnav" aria-label="この年のイベント">
          {events.map((e, i) => (
            <button
              type="button"
              key={i}
              class={nowEvent === i ? 'is-now' : ''}
              aria-current={nowEvent === i ? 'location' : undefined}
              onClick={() => document.getElementById(`ev${i}`)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })}
            >
              {e.label || e.category}
            </button>
          ))}
        </nav>
      ) : null}
      <div ref={sections}>
        {events.map((e, ei) => {
          const start = drawn;
          const visible = e.photos.slice(0, Math.max(0, limit - start));
          drawn += e.photos.length;
          if (visible.length === 0 && start >= limit) return null;
          return (
            <section class="ev" id={`ev${ei}`} data-ev={ei} key={ei} aria-labelledby={`evh${ei}`}>
              <h2 id={`evh${ei}`}>{e.label || e.category}</h2>
              <span class="cnt">{e.photos.length} 枚</span>
              {e.description ? <p class="ev-desc">{e.description}</p> : null}
              <div class="grid">
                {visible.map((p, pi) => {
                  const n = start + pi;
                  const alt = p.caption ?? `${yearText} ${heading(ei)}`;
                  return (
                    <button type="button" key={p.id} class="tile-btn" onClick={() => openViewer(route, n)} aria-label={alt}>
                      <PhotoImg photo={p} size="tile" alt="" aspect="4 / 3" class="tile" />
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <div ref={sentinel} class="sentinel" aria-hidden="true" />
      {events.length === 0 ? <p>この年の写真はまだありません。</p> : null}
      <nav class="pn" aria-label="前後の年">
        {neighbors.prev ? (
          <a href={href(`/timeline/${neighbors.prev}`)} onClick={() => navigate(`/timeline/${neighbors.prev}`)}>
            ← {yearLabel(neighbors.prev).big}
          </a>
        ) : (
          <span />
        )}
        {neighbors.next ? <a href={href(`/timeline/${neighbors.next}`)}>{yearLabel(neighbors.next).big} →</a> : <span />}
      </nav>
      {vIndex !== undefined && flat[vIndex] ? (
        <Viewer
          photos={flat.map((f) => f.photo)}
          index={vIndex}
          caption={(p, i) => {
            const f = flat[i]!;
            const c: { title: string; date?: string; spot?: string; note?: string } = { title: `${yearText} ${heading(f.eventIndex)}`.trim() };
            if (p.month && p.day) c.date = `${p.month}月${p.day}日`;
            if (p.spot) c.spot = spotName.get(p.spot) ?? p.spot;
            if (p.caption) c.note = p.caption;
            return c;
          }}
          onIndex={(i) => setViewerIndex(route, i)}
          onClose={() => closeViewer(route)}
        />
      ) : null}
    </main>
  );
}
